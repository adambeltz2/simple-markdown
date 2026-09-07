package com.simplemarkdown.app.ui.screens

import android.widget.TextView
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import io.noties.markwon.Markwon
import io.noties.markwon.ext.strikethrough.StrikethroughPlugin
import io.noties.markwon.ext.tables.TablePlugin
import io.noties.markwon.ext.tasklist.TaskListPlugin
import io.noties.markwon.html.HtmlPlugin
import io.noties.markwon.linkify.LinkifyPlugin

@Composable
fun MarkdownPreview(content: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val textColor = MaterialTheme.colorScheme.onBackground.toArgbInt()

    val markwon = remember(context) {
        Markwon.builder(context)
            .usePlugin(StrikethroughPlugin.create())
            .usePlugin(TablePlugin.create(context))
            .usePlugin(TaskListPlugin.create(context))
            .usePlugin(HtmlPlugin.create())
            .usePlugin(LinkifyPlugin.create())
            .build()
    }

    AndroidView(
        modifier = modifier,
        factory = { ctx ->
            TextView(ctx).apply {
                setPadding(48, 32, 48, 96)
                textSize = 16f
            }
        },
        update = { textView ->
            textView.setTextColor(textColor)
            textView.setLinkTextColor(textColor)
            markwon.setMarkdown(textView, content.ifBlank { "_Nothing to preview yet._" })
        },
    )
}

private fun androidx.compose.ui.graphics.Color.toArgbInt(): Int =
    android.graphics.Color.argb(
        (alpha * 255).toInt(),
        (red * 255).toInt(),
        (green * 255).toInt(),
        (blue * 255).toInt(),
    )
