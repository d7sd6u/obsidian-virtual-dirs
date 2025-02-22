import {
	TFolder,
	TFile,
	FileView,
	WorkspaceLeaf,
	MarkdownPreviewView,
	App,
} from "obsidian";
import Main from "./main";

function getDirLinkList(file: TFolder, app: App) {
	let text = "";
	for (const child of file.children) {
		if (child === file) continue;
		text += "\n";
		if (child instanceof TFile) {
			text += `[[${app.metadataCache.fileToLinktext(child, file.path)}]]`;
		} else if (child instanceof TFolder) {
			const indexFile = child.children.find(
				(c): c is TFile =>
					c instanceof TFile && c.basename === child.name,
			);
			if (indexFile) {
				text += `[[${app.metadataCache.fileToLinktext(indexFile, file.path)}]]`;
			}
		}
	}
	return text;
}
function replaceAll(orig: string, matcher: RegExp, replacement: string) {
	let i = 0;
	while (i < 100 && orig.match(matcher)) {
		orig = orig.replace(matcher, replacement);
		i++;
	}
	return orig;
}
export function generateVirtualDirIndex(
	file: TFile,
	template: string,
	app: App,
) {
	let text = template;
	if (!file.parent) return text;
	text = replaceAll(text, /\{\{folderPath\}\}/, file.parent.path);
	text = replaceAll(text, /\{\{folderName\}\}/, file.parent.name);
	text = replaceAll(
		text,
		/\{\{folderChildrenList\}\}/,
		getDirLinkList(file.parent, app),
	);
	return text;
}
export const DIR_VIEW_TYPE = "dirview";
export class DirView extends FileView {
	constructor(
		leaf: WorkspaceLeaf,
		private plugin: Main,
	) {
		super(leaf);
		this.titleEl.contentEditable = "true";
		let prevValue = this.titleEl.innerText;
		this.titleEl.oninput = () => {
			const nextValue = this.titleEl.innerText;
			if (!nextValue) {
				this.titleEl.innerText = prevValue;
			} else {
				prevValue = nextValue;
			}
		};
	}

	getViewType() {
		return DIR_VIEW_TYPE;
	}

	override navigation = true;
	override icon = "folder";

	override allowNoFile = false;

	private preview: MarkdownPreviewView | undefined;

	override onLoadFile(file: TFile) {
		this.removeHighlightFileEntry();
		if (file.parent) this.highlightFileEntry(file.parent.path);
		if (!this.preview)
			this.preview = new MarkdownPreviewView(
				this as unknown as HTMLElement,
			);

		this.preview.set(
			generateVirtualDirIndex(
				file,
				this.plugin.settings.template,
				this.app,
			),
			true,
		);
		this.preview.rerender(true);
		return Promise.resolve();
	}

	override onClose() {
		this.removeHighlightFileEntry();
		return Promise.resolve();
	}

	highlightFileEntry(filePath: string) {
		const entries = document.querySelectorAll(`[data-path="${filePath}"]`);
		entries.forEach((entry) => {
			if (!entry.classList.contains("is-active"))
				entry.classList.add(
					"is-active",
					"is-highlighted-via-virtual-dirs",
				);
		});
	}

	removeHighlightFileEntry() {
		const entries = document.querySelectorAll(
			`.is-highlighted-via-virtual-dirs`,
		);
		entries.forEach((entry) => {
			entry.classList.remove(
				"is-active",
				"is-highlighted-via-virtual-dirs",
			);
		});
	}
}
