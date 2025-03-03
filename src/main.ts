import {
	App,
	MetadataCache,
	TAbstractFile,
	TFile,
	TFolder,
	Vault,
	Workspace,
} from "obsidian";
import { getTFileConstructor } from "../obsidian-typings/src/obsidian/implementations/Constructors/getTFileConstructor";

import {
	folderPrefix,
	isIndexFile,
	isIndexPath,
} from "../obsidian-reusables/src/indexFiles";
import PluginWithSettings from "../obsidian-reusables/src/PluginWithSettings";
import { DIR_VIEW_TYPE, DirView, generateVirtualDirIndex } from "./DirView";
import { DEFAULT_SETTINGS, SettingsTab } from "./settings";

const TFileConstructor = getTFileConstructor();

export default class Main extends PluginWithSettings(DEFAULT_SETTINGS) {
	private virtualFilesCache = new Map<string, TFile>();
	private virtualFileLinksLookup = new Map<string, TFile>();

	override async onload() {
		await this.initSettings(SettingsTab);

		this.registerViewAndEmbedAndExtension();

		this.patchCachedRead();
		this.patchGetFirstLinkpathDest();
		this.patchOpenLinkText();
		this.patchRenameFile();

		this.hookIntoFSEvents();

		this.initAfterLayout();
	}

	private registerViewAndEmbedAndExtension() {
		this.registerView(DIR_VIEW_TYPE, (leaf) => new DirView(leaf, this));

		this.registerExtensions(["dir"], DIR_VIEW_TYPE);

		this.app.embedRegistry.embedByExtension["dir"] =
			this.app.embedRegistry.embedByExtension.md;
	}

	private patchCachedRead() {
		this.registerPatch(Vault.prototype, {
			cachedRead(next, plugin) {
				return async function (...args) {
					if (args[0].extension === "dir") {
						return generateVirtualDirIndex(
							args[0],
							plugin.settings.template,
							plugin.app,
						);
					}
					return next.apply(this, args);
				};
			},
		});
	}

	private patchGetFirstLinkpathDest() {
		this.registerPatch(MetadataCache.prototype, {
			getFirstLinkpathDest(next, plugin) {
				return function (...args) {
					return (
						plugin.virtualFileLinksLookup.get(args[0]) ??
						next.apply(this, args)
					);
				};
			},
		});
	}

	private patchOpenLinkText() {
		this.registerPatch(Workspace.prototype, {
			openLinkText(next) {
				return async function (...args) {
					const suffixWithDirExt =
						args[0].replace(/\.dir$/, "") + ".dir";
					const dirIndex = this.app.vault.getFiles().find((v) => {
						if (v.extension !== "dir") return false;
						return (
							v.path.endsWith("/" + suffixWithDirExt) ||
							v.path === suffixWithDirExt
						);
					});
					if (dirIndex) {
						await this.app.workspace.getLeaf().openFile(dirIndex);
						return;
					}
					return next.apply(this, args);
				};
			},
		});
	}

	private patchRenameFile() {
		this.registerPatch(this.app.fileManager, {
			renameFile(next, plugin) {
				return function (...args) {
					const [file, newPath] = args;
					if (file instanceof TFile && file.extension === "dir") {
						if (file.parent) {
							// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
							delete this.app.vault.fileMap[file.path];
							this.app.vault.fileMap[newPath] = file;
							plugin.virtualFilesCache.delete(file.path);
							plugin.virtualFilesCache.set(newPath, file);
							file.setPath(newPath);
						}
					}
					return next.apply(this, args);
				};
			},
		});
	}

	private initAfterLayout() {
		const updateVirtualIndexes = () => {
			this.cleanVirtualIndexes();
			const folderToRealIndexes = new Map<string, string>();
			for (const node of this.app.vault.getFiles()) {
				if (node.parent && isIndexFile(node))
					folderToRealIndexes.set(node.parent.path, node.path);
			}
			for (const node of this.app.vault.getAllFolders(true)) {
				if (!folderToRealIndexes.has(node.path))
					this.createAndAddVirtualIndex(node);
			}
		};
		this.app.workspace.onLayoutReady(() => {
			updateVirtualIndexes();
			this.reinitFileExplorers();
		});
	}

	private hookIntoFSEvents() {
		const onDelete = (file: TAbstractFile | string) => {
			let parent: TFolder | undefined | null;
			let isIndex = false;
			if (typeof file === "string") {
				isIndex = isIndexPath(file);
				const parentPath =
					file.split("/").slice(0, -1).join("/") || "/";
				const p = this.app.vault.fileMap[parentPath];
				if (!(p instanceof TFolder)) return;
				parent = p;
			} else {
				isIndex = isIndexFile(file);
				parent = file.parent;
			}
			if (isIndex && parent && !parent.deleted)
				this.createAndAddVirtualIndex(parent);
			if (file instanceof TFolder) {
				this.removeVirtualIndex(file);
			}
		};
		const onCreate = (file: TAbstractFile) => {
			if (file instanceof TFolder) this.createAndAddVirtualIndex(file);
			if (isIndexFile(file) && file.parent)
				this.removeVirtualIndex(file.parent);
		};
		this.registerEvent(this.app.vault.on("create", onCreate));
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (
					file instanceof TFolder ||
					(file instanceof TFile && file.extension === "dir")
				)
					return;
				onCreate(file);
				onDelete(oldPath);
			}),
		);
		this.registerEvent(this.app.vault.on("delete", onDelete));
	}

	private createVirtualFile(path: string, app: App) {
		const virtualItem: TFile = new TFileConstructor(app.vault, path);
		virtualItem.stat = {
			ctime: Date.now(),
			mtime: Date.now(),
			size: 500,
		};
		const dirPath = path.split("/").slice(0, -1).join("/");

		const parentItem = app.vault.fileMap[dirPath || "/"];
		if (parentItem instanceof TFolder) virtualItem.parent = parentItem;

		const parts = path.split("/");
		for (const [i] of parts.entries()) {
			const prefix = parts.slice(-(i + 1)).join("/");
			app.metadataCache.uniqueFileLookup.add(
				virtualItem.name.toLowerCase(),
				virtualItem,
			);
			this.virtualFileLinksLookup.set(prefix, virtualItem);
			this.virtualFileLinksLookup.set(
				prefix.replace(/\.dir$/, ""),
				virtualItem,
			);
		}
		return virtualItem;
	}

	private cleanVirtualIndexes() {
		const folderToRealIndexes = new Map<string, string>();
		for (const node of this.app.vault.getFiles()) {
			if (
				node instanceof TFile &&
				node.parent &&
				(node.basename === node.parent.name || node.path === "Root.md")
			) {
				folderToRealIndexes.set(node.parent.path, node.path);
			}
		}
		const removedPaths = new Set<string>();
		for (const file of this.virtualFilesCache.values()) {
			if (
				file.parent &&
				(folderToRealIndexes.has(file.parent.path) ||
					file.path !== folderPrefix(file.parent) + file.name)
			) {
				this.removeVirtualIndex(file.parent);
				removedPaths.add(file.path);
			}
		}

		for (const [key, file] of this.virtualFileLinksLookup) {
			if (removedPaths.has(file.path))
				this.virtualFileLinksLookup.delete(key);
			this.app.metadataCache.uniqueFileLookup.remove(
				file.name.toLowerCase(),
				file,
			);
		}
	}

	private reinitFileExplorers() {
		this.app.workspace.getLeavesOfType("file-explorer").forEach((l) => {
			if ("sort" in l.view) {
				l.view.fileItems = {};
				l.view.files.map = new WeakMap();
				l.view.load();
			}
		});
	}

	private removeVirtualIndex(folder: TFolder) {
		const path = getVirtualIndexPathForFolder(folder);
		this.app.vault.onChange("file-removed", path);
	}
	private createAndAddVirtualIndex(folder: TFolder) {
		const virtualIndexPath = getVirtualIndexPathForFolder(folder);
		const virtualIndexFile = this.createVirtualFile(
			virtualIndexPath,
			this.app,
		);

		const realFolder = virtualIndexFile.parent;
		if (realFolder)
			realFolder.children = [
				...realFolder.children.filter(
					(v) => v.path !== virtualIndexFile.path,
				),
				virtualIndexFile,
			];
		if (realFolder !== folder) {
			console.error("Mismatch in folders!", realFolder, folder);
		}
		this.app.vault.fileMap[virtualIndexPath] = virtualIndexFile;
	}

	override unload(): void {
		this.uninstallPatches();
		this.cleanVirtualIndexes();
		this.reinitFileExplorers();
	}
}
function getVirtualIndexPathForFolder(folder: TFolder): string {
	if (folder.path === "/") return "Root.dir";
	return `${folder.path}/${folder.name}.dir`;
}
