import { PluginSettingTab, App, Setting } from "obsidian";
import Main from "./main";

export class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		override plugin: Main,
	) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Folder overview template")
			.setDesc(
				"Markdown template that is used when rendering directories",
			)
			.addTextArea((textArea) => {
				textArea
					.setValue(this.plugin.settings.template)
					.onChange(async (v) => {
						this.plugin.settings.template = v;
						await this.plugin.saveSettings();
					})
					.setPlaceholder(
						`# {{folderName}}\nThis is {{folderPath}}\nIts children:\n{{folderChildrenList}}`,
					);
				textArea.inputEl.style.minWidth = "250px";
				textArea.inputEl.style.minHeight = "100px";
			});
	}
}
export interface Settings {
	template: string;
}
export const DEFAULT_SETTINGS: Settings = {
	template: `# {{folderName}}
{{folderChildrenList}}
`,
};
