package com.simplemarkdown.app.data

import android.content.Context
import android.net.Uri
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Documents live as plain .md files under the app's private "documents" directory.
 * Import/export cross the SAF boundary explicitly (see [importFrom] / [exportTo]).
 */
class DocumentRepository(context: Context) {

    private val documentsDir: File = File(context.filesDir, "documents").apply { mkdirs() }
    private val resolver = context.contentResolver

    fun listDocuments(): List<MarkdownDocument> {
        val files = documentsDir.listFiles { f -> f.isFile && f.extension == "md" } ?: emptyArray()
        return files
            .sortedByDescending { it.lastModified() }
            .map { it.toDocument() }
    }

    fun readText(fileName: String): String {
        val file = File(documentsDir, fileName)
        return if (file.exists()) file.readText() else ""
    }

    fun write(fileName: String, content: String) {
        File(documentsDir, fileName).writeText(content)
    }

    fun delete(fileName: String) {
        File(documentsDir, fileName).delete()
    }

    fun rename(oldFileName: String, newTitle: String): String {
        val safeTitle = newTitle.ifBlank { "Untitled" }
        val newFileName = uniqueFileName(safeTitle, exclude = oldFileName)
        File(documentsDir, oldFileName).renameTo(File(documentsDir, newFileName))
        return newFileName
    }

    fun createNew(title: String = "Untitled"): String {
        val fileName = uniqueFileName(title)
        File(documentsDir, fileName).writeText("")
        return fileName
    }

    /** Copies text content from an external Uri (SAF picker or a VIEW/SEND intent) into a new local document. */
    fun importFrom(uri: Uri, suggestedTitle: String): String {
        val text = resolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: ""
        val fileName = uniqueFileName(suggestedTitle)
        File(documentsDir, fileName).writeText(text)
        return fileName
    }

    /** Writes the given content to an external Uri obtained via ACTION_CREATE_DOCUMENT. */
    fun exportTo(uri: Uri, content: String) {
        resolver.openOutputStream(uri, "wt")?.use { it.write(content.toByteArray()) }
    }

    /** Writes content into the app cache for sharing via FileProvider. */
    fun writeShareFile(context: Context, title: String, content: String): File {
        val shareDir = File(context.cacheDir, "shared").apply { mkdirs() }
        val file = File(shareDir, "${sanitize(title)}.md")
        file.writeText(content)
        return file
    }

    private fun uniqueFileName(title: String, exclude: String? = null): String {
        val base = sanitize(title).ifBlank { "Untitled" }
        var candidate = "$base.md"
        var i = 1
        while (File(documentsDir, candidate).exists() && candidate != exclude) {
            candidate = "$base-$i.md"
            i++
        }
        return candidate
    }

    private fun sanitize(name: String): String =
        name.trim().replace(Regex("[\\\\/:*?\"<>|]"), "_").take(80)

    private fun File.toDocument(): MarkdownDocument {
        val text = readText()
        val title = nameWithoutExtension
        val preview = text.lineSequence().firstOrNull { it.isNotBlank() }?.take(120) ?: ""
        return MarkdownDocument(
            fileName = name,
            title = title,
            preview = preview,
            lastModified = lastModified(),
        )
    }

    companion object {
        fun formatDate(millis: Long): String =
            SimpleDateFormat("MMM d, yyyy '·' h:mm a", Locale.getDefault()).format(Date(millis))
    }
}
