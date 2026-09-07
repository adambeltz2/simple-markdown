package com.simplemarkdown.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp

private enum class EditorMode { EDIT, PREVIEW }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditorScreen(
    title: String,
    initialContent: String,
    onBack: () -> Unit,
    onSave: (String) -> Unit,
    onRename: (String) -> Unit,
    onShare: (String) -> Unit,
    onExport: (String) -> Unit,
) {
    var mode by remember { mutableStateOf(EditorMode.EDIT) }
    var field by remember { mutableStateOf(TextFieldValue(initialContent)) }
    var currentTitle by remember { mutableStateOf(title) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var dirty by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    fun update(newValue: TextFieldValue) {
        field = newValue
        dirty = true
    }

    fun applyWrap(prefix: String, suffix: String = prefix, placeholder: String = "text") {
        update(wrapSelection(field, prefix, suffix, placeholder))
    }

    fun applyLinePrefix(prefix: String) {
        update(prefixLines(field, prefix))
    }

    fun saveNow() {
        onSave(field.text)
        dirty = false
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    navigationIcon = {
                        IconButton(onClick = {
                            if (dirty) saveNow()
                            onBack()
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    title = {
                        Text(
                            currentTitle,
                            modifier = Modifier,
                        )
                    },
                    actions = {
                        IconButton(onClick = { showRenameDialog = true }) {
                            Icon(Icons.Filled.Edit, contentDescription = "Rename")
                        }
                        IconButton(onClick = { onShare(field.text) }) {
                            Icon(Icons.Filled.Share, contentDescription = "Share")
                        }
                        IconButton(onClick = { onExport(field.text) }) {
                            Icon(Icons.Filled.Download, contentDescription = "Export")
                        }
                        IconButton(onClick = { saveNow() }) {
                            Icon(Icons.Filled.Save, contentDescription = "Save")
                        }
                    },
                )
                TabRow(selectedTabIndex = mode.ordinal) {
                    Tab(
                        selected = mode == EditorMode.EDIT,
                        onClick = { mode = EditorMode.EDIT },
                        text = { Text("Edit") },
                        icon = { Icon(Icons.Filled.EditNote, contentDescription = null) },
                    )
                    Tab(
                        selected = mode == EditorMode.PREVIEW,
                        onClick = {
                            if (dirty) saveNow()
                            mode = EditorMode.PREVIEW
                        },
                        text = { Text("Preview") },
                        icon = { Icon(Icons.Filled.Visibility, contentDescription = null) },
                    )
                }
                if (mode == EditorMode.EDIT) {
                    FormattingToolbar(
                        onBold = { applyWrap("**") },
                        onItalic = { applyWrap("*") },
                        onStrikethrough = { applyWrap("~~") },
                        onCode = { applyWrap("`") },
                        onCodeBlock = { applyWrap("```\n", "\n```", "code") },
                        onHeading = { applyLinePrefix("# ") },
                        onBullet = { applyLinePrefix("- ") },
                        onNumbered = { applyLinePrefix("1. ") },
                        onQuote = { applyLinePrefix("> ") },
                        onTask = { applyLinePrefix("- [ ] ") },
                        onLink = { update(insertLink(field)) },
                        onRule = { update(insertAtCursor(field, "\n---\n")) },
                    )
                }
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when (mode) {
                EditorMode.EDIT -> {
                    OutlinedTextField(
                        value = field,
                        onValueChange = { update(it) },
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp)
                            .focusRequester(focusRequester),
                        placeholder = { Text("Start writing markdown…") },
                        textStyle = androidx.compose.ui.text.TextStyle(
                            fontFamily = FontFamily.Monospace,
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = Color.Transparent,
                        ),
                    )
                }
                EditorMode.PREVIEW -> {
                    MarkdownPreview(content = field.text, modifier = Modifier.fillMaxSize())
                }
            }
        }
    }

    if (showRenameDialog) {
        var draft by remember { mutableStateOf(currentTitle) }
        AlertDialog(
            onDismissRequest = { showRenameDialog = false },
            title = { Text("Rename document") },
            text = {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    singleLine = true,
                    label = { Text("Title") },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showRenameDialog = false
                    currentTitle = draft
                    onRename(draft)
                }) { Text("Rename") }
            },
            dismissButton = {
                TextButton(onClick = { showRenameDialog = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun FormattingToolbar(
    onBold: () -> Unit,
    onItalic: () -> Unit,
    onStrikethrough: () -> Unit,
    onCode: () -> Unit,
    onCodeBlock: () -> Unit,
    onHeading: () -> Unit,
    onBullet: () -> Unit,
    onNumbered: () -> Unit,
    onQuote: () -> Unit,
    onTask: () -> Unit,
    onLink: () -> Unit,
    onRule: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 4.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ToolbarIcon(Icons.Filled.FormatBold, "Bold", onBold)
        ToolbarIcon(Icons.Filled.FormatItalic, "Italic", onItalic)
        ToolbarIcon(Icons.Filled.StrikethroughS, "Strikethrough", onStrikethrough)
        ToolbarIcon(Icons.Filled.Code, "Inline code", onCode)
        ToolbarIcon(Icons.Filled.DataObject, "Code block", onCodeBlock)
        ToolbarIcon(Icons.Filled.Title, "Heading", onHeading)
        ToolbarIcon(Icons.Filled.FormatListBulleted, "Bullet list", onBullet)
        ToolbarIcon(Icons.Filled.FormatListNumbered, "Numbered list", onNumbered)
        ToolbarIcon(Icons.Filled.CheckBox, "Task", onTask)
        ToolbarIcon(Icons.Filled.FormatQuote, "Quote", onQuote)
        ToolbarIcon(Icons.Filled.Link, "Link", onLink)
        ToolbarIcon(Icons.Filled.HorizontalRule, "Divider", onRule)
    }
}

@Composable
private fun ToolbarIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(onClick = onClick) {
        Icon(icon, contentDescription = description)
    }
}
