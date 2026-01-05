"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const markdownEditor_1 = require("./markdownEditor");
function activate(context) {
    console.log('Typora VSC extension is now active!');
    context.subscriptions.push(markdownEditor_1.MarkdownEditorProvider.register(context));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map