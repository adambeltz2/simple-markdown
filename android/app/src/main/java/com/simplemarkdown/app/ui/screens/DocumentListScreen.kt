package com.simplemarkdown.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.simplemarkdown.app.data.DocumentRepository
import com.simplemarkdown.app.data.MarkdownDocument

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentListScreen(
    documents: List<MarkdownDocument>,
    onOpen: (MarkdownDocument) -> Unit,
    onNew: () -> Unit,
    onImport: () -> Unit,
    onDelete: (MarkdownDocument) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Simple Markdown") })
        },
        floatingActionButton = {
            Column(horizontalAlignment = Alignment.End) {
                SmallFloatingActionButton(onClick = onImport) {
                    Icon(Icons.Filled.FileOpen, contentDescription = "Import file")
                }
                Spacer(Modifier.height(12.dp))
                ExtendedFloatingActionButton(
                    onClick = onNew,
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text("New") },
                )
            }
        },
    ) { padding ->
        if (documents.isEmpty()) {
            EmptyState(Modifier.padding(padding))
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                items(documents, key = { it.fileName }) { doc ->
                    DocumentRow(doc, onClick = { onOpen(doc) }, onDelete = { onDelete(doc) })
                }
                item { Spacer(Modifier.height(72.dp)) }
            }
        }
    }
}

@Composable
private fun EmptyState(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Filled.Description,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = MaterialTheme.colorScheme.outline,
            )
            Spacer(Modifier.height(12.dp))
            Text("No documents yet", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                "Tap + to create a new markdown file, or import one from your device.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DocumentRow(doc: MarkdownDocument, onClick: () -> Unit, onDelete: () -> Unit) {
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    doc.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (doc.preview.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        doc.preview,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    DocumentRepository.formatDate(doc.lastModified),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.outline,
                )
            }
            IconButton(onClick = { showDeleteConfirm = true }) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete")
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete \"${doc.title}\"?") },
            text = { Text("This can't be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteConfirm = false
                    onDelete()
                }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancel") }
            },
        )
    }
}
