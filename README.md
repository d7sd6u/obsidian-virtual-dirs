# Virtual Dirs

Creates virtual read-only files with `.dir` extension that are created for every folder without folder note in your vault. They do not take space on your disk (as they only exist in-memory), but they could be searched, embedded (in notes and in Canvases), previewed, linked just like any normal note. You can also use your own markdown template for the contents of these files.

Use with [folders-graph](https://github.com/d7sd6u/obsidian-folders-graph), [hide-index-files](https://github.com/d7sd6u/obsidian-hide-index-files) and [folder-notes](https://github.com/LostPaul/obsidian-folder-notes) for the full experience.

## How it looks like

### Search

https://github.com/user-attachments/assets/4cdffd14-a379-41d6-b5d1-d32d6a7859da

### Embed

https://github.com/user-attachments/assets/f4b7b4b4-961b-4d65-9b45-7e7bafdd1586

### Preview / Links

https://github.com/user-attachments/assets/d66af9c6-27a1-4c1b-9ebe-82a231fa5e7c

### Custom template

https://github.com/user-attachments/assets/b921ba38-c735-4008-a928-7cbc26959e37

## Other plugins

- [lazy-cached-vault-load](https://github.com/d7sd6u/obsidian-lazy-cached-vault-load) - reduce startup time on mobile to 2-3s even with 30k+ notes vault
- [auto-folder-note-paste](https://github.com/d7sd6u/obsidian-auto-folder-note-paste) - makes sure your attachments are "inside" your note on paste and drag'n'drop by making your note a folder note
- [folders-graph](https://github.com/d7sd6u/obsidian-folders-graph) - adds folders as nodes to graph views
- [reveal-folded](https://github.com/d7sd6u/obsidian-reveal-folded) - reveal current file in file explorer while collapsing everything else
- [hide-index-files](https://github.com/d7sd6u/obsidian-hide-index-files) - hide folder notes (index files) from file explorer
- [crosslink-advanced](https://github.com/d7sd6u/obsidian-crosslink-advanced) - adds commands to deal with [ftags](https://github.com/d7sd6u/obsidian-lazy-cached-vault-load?tab=readme-ov-file#wait-a-minute-what-are-folderindex-notes-what-are-ftags-what-do-you-mean-annexed)-oriented vaults: add ftags, create child note, open random unftagged file, etc.
- [viewer-ftags](https://github.com/d7sd6u/obsidian-viewer-ftags) - add ftags as chips on top of markdown/file editors/previews. And children as differently styled chips too!
- [git-annex-autofetch](https://github.com/d7sd6u/obsidian-git-annex-autofetch) - lets you open annexed but not present files as if they were right on your device (basically, NFS/overlay-fs hybrid in your Obsidian)

## Contributing

Issues and patches are welcome. This plugin is intended to be used with other plugins and I would try to do my best to support this use case, but I retain the right to refuse supporting any given plugin for arbitrary reasons.
