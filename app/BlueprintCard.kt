package com.quranmm.app

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.PlaylistPlay
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.quranmm.app.AppTheme

@Composable
fun BlueprintCard(theme: AppTheme, title: Any, titleFontSize: androidx.compose.ui.unit.TextUnit = 13.sp, isPlaying: Boolean, isAudioAvailable: Boolean, onPlayPause: (() -> Unit)?, onPlayForward: (() -> Unit)? = null, isPlayForwardEnabled: Boolean = false, onCopy: () -> Unit, onZoomIn: () -> Unit, onZoomOut: () -> Unit, content: @Composable () -> Unit) {

    // 1. OUTER MARGINS: Reduced to 4.dp horizontal (wider card) and 2.dp vertical (tighter gap between cards)
    Card(Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 4.dp), colors = CardDefaults.cardColors(containerColor = theme.card), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                if (title is AnnotatedString) {
                    Text(text = title, modifier = Modifier.weight(1f), color = theme.primary, fontWeight = FontWeight.Bold)
                } else {
                    Text(text = title.toString(), modifier = Modifier.weight(1f), fontSize = titleFontSize, fontWeight = FontWeight.Bold, color = theme.primary)
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (onPlayPause != null) {
                        val icon = if (isPlaying) Icons.Default.Pause else Icons.Filled.PlayCircle
                        val iconTint = if (isAudioAvailable) theme.primary else theme.primary.copy(alpha = 0.3f)
                        Icon(icon, null, Modifier.size(26.dp).clickable { onPlayPause() }, tint = iconTint)
                    }

                    if (onPlayForward != null) {
                        val fwdIconTint = if (isPlayForwardEnabled) theme.primary else Color.LightGray.copy(alpha = 0.5f)
                        Icon(Icons.Default.PlaylistPlay, null, Modifier.size(26.dp).clickable(enabled = isPlayForwardEnabled) { onPlayForward() }, tint = fwdIconTint)
                    }

                    Icon(Icons.Default.ContentCopy, null, Modifier.size(20.dp).clickable { onCopy() }, tint = theme.primary)
                    Text("A-", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = theme.primary, modifier = Modifier.clickable { onZoomOut() }.padding(horizontal = 4.dp))
                    Text("A+", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = theme.primary, modifier = Modifier.clickable { onZoomIn() }.padding(horizontal = 4.dp))
                }
            }

            // 2. INNER CONTENT: Reduced from 16.dp to 8.dp to give the text much more room
            Box(Modifier.fillMaxWidth().background(Color.White).padding(12.dp)) {
                content()
            }
        }
    }
}