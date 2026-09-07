package com.simplemarkdown.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.simplemarkdown.app.data.DocumentRepository
import com.simplemarkdown.app.ui.screens.DocumentListScreen
import com.simplemarkdown.app.ui.screens.EditorScreen
import com.simplemarkdown.app.ui.theme.SimpleMarkdownTheme
import java.net.URLDecoder
import java.net.URLEncoder

class MainActivity : ComponentActivity() {

    private lateinit var repository: DocumentRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = DocumentRepository(this)

        setContent {
            SimpleMarkdownTheme {
                val navController = rememberNavController()
                var refreshKey by remember { mutableIntStateOf(0) }

                val importLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.OpenDocument(),
                ) { uri: Uri? ->
                    if (uri != null) {
                        val name = queryDisplayName(uri) ?: "Imported"
                        val fileName = repository.importFrom(uri, name.removeSuffix(".md"))
                        refreshKey++
                        navController.navigateToEditor(fileName)
                    }
                }

                var pendingExportContent by remember { mutableStateOf<String?>(null) }
                val exportLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.CreateDocument("text/markdown"),
                ) { uri: Uri? ->
                    val content = pendingExportContent
                    if (uri != null && content != null) {
                        repository.exportTo(uri, content)
                    }
                    pendingExportContent = null
                }

                // Handle files opened from other apps (VIEW/SEND intents).
                LaunchedEffect(Unit) {
                    handleIncomingIntent(intent, navController) { refreshKey++ }
                }

                NavHost(navController = navController, startDestination = "list") {
                    composable("list") {
                        val documents by remember(refreshKey) {
                            mutableStateOf(repository.listDocuments())
                        }
                        DocumentListScreen(
                            documents = documents,
                            onOpen = { navController.navigateToEditor(it.fileName) },
                            onNew = {
                                val fileName = repository.createNew()
                                refreshKey++
                                navController.navigateToEditor(fileName)
                            },
                            onImport = { importLauncher.launch(arrayOf("text/*", "text/markdown", "text/plain")) },
                            onDelete = {
                                repository.delete(it.fileName)
                                refreshKey++
                            },
                        )
                    }
                    composable("editor/{fileName}") { backStackEntry ->
                        val encoded = backStackEntry.arguments?.getString("fileName") ?: return@composable
                        val fileName = URLDecoder.decode(encoded, "UTF-8")
                        val initialContent = remember(fileName) { repository.readText(fileName) }
                        var currentFileName by remember(fileName) { mutableStateOf(fileName) }

                        EditorScreen(
                            title = currentFileName.removeSuffix(".md"),
                            initialContent = initialContent,
                            onBack = {
                                refreshKey++
                                navController.popBackStack()
                            },
                            onSave = { content -> repository.write(currentFileName, content) },
                            onRename = { newTitle ->
                                currentFileName = repository.rename(currentFileName, newTitle)
                                refreshKey++
                            },
                            onShare = { content ->
                                val file = repository.writeShareFile(this@MainActivity, currentFileName.removeSuffix(".md"), content)
                                val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/markdown"
                                    putExtra(Intent.EXTRA_STREAM, uri)
                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                }
                                startActivity(Intent.createChooser(shareIntent, "Share markdown"))
                            },
                            onExport = { content ->
                                pendingExportContent = content
                                exportLauncher.launch("${currentFileName.removeSuffix(".md")}.md")
                            },
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    private fun handleIncomingIntent(intent: Intent?, navController: NavHostController, onImported: () -> Unit) {
        val uri: Uri? = when (intent?.action) {
            Intent.ACTION_VIEW -> intent.data
            Intent.ACTION_SEND -> intent.getParcelableExtra(Intent.EXTRA_STREAM)
            else -> null
        }
        if (uri != null) {
            val name = queryDisplayName(uri) ?: "Imported"
            val fileName = repository.importFrom(uri, name.removeSuffix(".md"))
            onImported()
            navController.navigateToEditor(fileName)
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        return try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (cursor.moveToFirst() && nameIndex >= 0) cursor.getString(nameIndex) else null
            }
        } catch (e: Exception) {
            null
        }
    }
}

private fun NavHostController.navigateToEditor(fileName: String) {
    val encoded = URLEncoder.encode(fileName, "UTF-8")
    navigate("editor/$encoded")
}
