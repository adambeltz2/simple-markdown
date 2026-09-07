package com.simplemarkdown.app.ui.screens

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue

/** Wraps the current selection with [prefix]/[suffix] (e.g. **bold**), or inserts a placeholder if nothing is selected. */
fun wrapSelection(value: TextFieldValue, prefix: String, suffix: String = prefix, placeholder: String = "text"): TextFieldValue {
    val selection = value.selection
    val text = value.text
    val start = selection.min
    val end = selection.max

    return if (start == end) {
        val newText = text.substring(0, start) + prefix + placeholder + suffix + text.substring(end)
        val selStart = start + prefix.length
        val selEnd = selStart + placeholder.length
        TextFieldValue(newText, TextRange(selStart, selEnd))
    } else {
        val selected = text.substring(start, end)
        val newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
        TextFieldValue(newText, TextRange(start + prefix.length, end + prefix.length))
    }
}

/** Inserts [linePrefix] at the start of the line touching the current selection, e.g. "# ", "- ", "> ". */
fun prefixLines(value: TextFieldValue, linePrefix: String): TextFieldValue {
    val text = value.text
    val selection = value.selection
    val lineStart = if (selection.min == 0) 0 else text.lastIndexOf('\n', selection.min - 1) + 1

    val newText = text.substring(0, lineStart) + linePrefix + text.substring(lineStart)
    val newSelection = TextRange(selection.min + linePrefix.length, selection.max + linePrefix.length)
    return TextFieldValue(newText, newSelection)
}

/** Inserts a markdown link at the cursor, wrapping the current selection as the link text. */
fun insertLink(value: TextFieldValue): TextFieldValue {
    val selection = value.selection
    val text = value.text
    val start = selection.min
    val end = selection.max
    val label = if (start != end) text.substring(start, end) else "link text"
    val insertion = "[$label](https://)"
    val newText = text.substring(0, start) + insertion + text.substring(end)
    val urlStart = start + label.length + 3
    val urlEnd = urlStart + "https://".length
    return TextFieldValue(newText, TextRange(urlStart, urlEnd))
}

fun insertAtCursor(value: TextFieldValue, insertion: String): TextFieldValue {
    val start = value.selection.min
    val end = value.selection.max
    val text = value.text
    val newText = text.substring(0, start) + insertion + text.substring(end)
    val cursor = start + insertion.length
    return TextFieldValue(newText, TextRange(cursor))
}
