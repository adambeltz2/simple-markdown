package com.simplemarkdown.app.data

data class MarkdownDocument(
    val fileName: String,
    val title: String,
    val preview: String,
    val lastModified: Long,
)
