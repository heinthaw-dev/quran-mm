package com.quranmm.app

import androidx.compose.foundation.text.ClickableText
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp

@Composable
fun JumpableText(rawText: String, fontScale: Float, theme: AppTheme, onJump: (Int, Int) -> Unit) {
    val softPinkUI = Color(0xFFD81B60)
    val annotatedString = buildAnnotatedString {
        append(rawText)
        "(?<=\\s)[0-9]+[a-zA-Z]?(?=[\\s။,]|\$)".toRegex().findAll(rawText).forEach {
            addStyle(SpanStyle(color = softPinkUI, baselineShift = BaselineShift.Superscript, fontSize = 12.sp, fontWeight = FontWeight.Bold), it.range.first, it.range.last + 1)
        }
        "\\[\\d+:[\\d,\\-]+\\]".toRegex().findAll(rawText).forEach {
            addStyle(SpanStyle(color = theme.primary, fontWeight = FontWeight.Bold), it.range.first, it.range.last + 1)
            val cleanLink = it.value.replace("[", "").replace("]", "")
            val parts = cleanLink.split(":")
            if (parts.size == 2) {
                val surahId = parts[0]
                val firstAyatId = parts[1].split(",")[0].split("-")[0].trim()
                val jumpTarget = "$surahId:$firstAyatId"
                addStringAnnotation("JUMP", jumpTarget, it.range.first, it.range.last + 1)
            }
        }
        "^\\[\\d+[a-zA-Z]?\\]".toRegex(RegexOption.MULTILINE).findAll(rawText).forEach {
            addStyle(SpanStyle(color = softPinkUI, fontWeight = FontWeight.Bold), it.range.first, it.range.last + 1)
        }
    }
    ClickableText(
        text = annotatedString,
        style = androidx.compose.ui.text.TextStyle(
            fontSize = (18 * fontScale).sp,
            color = Color(0xFF333333),
            lineHeight = (28 * fontScale).sp,
            textAlign = TextAlign.Left // 🚀 ADD THIS LINE HERE
        ),
        onClick = { offset ->
            annotatedString.getStringAnnotations("JUMP", offset, offset).firstOrNull()?.let { ann ->
                val parts = ann.item.split(":")
                if (parts.size == 2) {
                    parts[0].toIntOrNull()?.let { sId ->
                        parts[1].toIntOrNull()?.let { aId ->
                            onJump(sId, aId)
                        }
                    }
                }
            }
        }
    )
}
