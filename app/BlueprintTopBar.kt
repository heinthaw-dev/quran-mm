package com.quranmm.app

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.GpsNotFixed
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun BlueprintTopBar(theme: AppTheme, surahProg: String, ayatProg: String, englishTitle: String, myanmarTitle: String, isSurahPlaying: Boolean, isPrevSurahEnabled: Boolean, isNextSurahEnabled: Boolean, isPrevAyatEnabled: Boolean, isNextAyatEnabled: Boolean, jumpHistoryCount: Int, isAudioAvailable: Boolean, isAutoTracking: Boolean, onOpenMenu: () -> Unit, onSurahClick: () -> Unit, onAyatClick: () -> Unit, onHistoryClick: () -> Unit, onNextSurah: () -> Unit, onPrevSurah: () -> Unit, onNextAyat: () -> Unit, onPrevAyat: () -> Unit, onPlaySurah: () -> Unit, onToggleAutoTrack: () -> Unit) {
    Column(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp)) {
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceEvenly, Alignment.CenterVertically) {
            Icon(Icons.Default.Menu, contentDescription = "Menu", Modifier.size(32.dp).clickable { onOpenMenu() }.padding(4.dp), tint = theme.primary)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.KeyboardArrowLeft, null, Modifier.size(28.dp).clickable(enabled = isPrevSurahEnabled) { onPrevSurah() }.padding(2.dp), tint = if (isPrevSurahEnabled) theme.primary else Color.LightGray)
                Surface(shape = RoundedCornerShape(8.dp), color = theme.bg, shadowElevation = 4.dp, modifier = Modifier.padding(horizontal = 2.dp).clickable { onSurahClick() }) {
                    Text("Surah\n$surahProg", modifier = Modifier.defaultMinSize(minWidth = 60.dp).padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, lineHeight = 14.sp, color = theme.primary)
                }
                Icon(Icons.Default.KeyboardArrowRight, null, Modifier.size(28.dp).clickable(enabled = isNextSurahEnabled) { onNextSurah() }.padding(2.dp), tint = if (isNextSurahEnabled) theme.primary else Color.LightGray)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.KeyboardArrowLeft, null, Modifier.size(28.dp).clickable(enabled = isPrevAyatEnabled) { onPrevAyat() }.padding(2.dp), tint = if (isPrevAyatEnabled) theme.primary else Color.LightGray)
                Surface(shape = RoundedCornerShape(8.dp), color = theme.bg, shadowElevation = 4.dp, modifier = Modifier.padding(horizontal = 2.dp).clickable { onAyatClick() }) {
                    Text("Ayat\n$ayatProg", modifier = Modifier.defaultMinSize(minWidth = 60.dp).padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, lineHeight = 14.sp, color = theme.primary)
                }
                Icon(Icons.Default.KeyboardArrowRight, null, Modifier.size(28.dp).clickable(enabled = isNextAyatEnabled) { onNextAyat() }.padding(2.dp), tint = if (isNextAyatEnabled) theme.primary else Color.LightGray)
            }
            val hasHistory = jumpHistoryCount > 0
            Icon(Icons.Default.Refresh, contentDescription = "History", modifier = Modifier.size(32.dp).clickable(enabled = hasHistory) { onHistoryClick() }.padding(4.dp), tint = if (hasHistory) theme.primary else Color.LightGray)
        }
        HorizontalDivider(Modifier.padding(vertical = 4.dp))
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(englishTitle, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = theme.primary)

                Spacer(Modifier.width(6.dp))

                val playIcon = if (isSurahPlaying) Icons.Default.Pause else Icons.Filled.PlayCircle
                val iconTint = if (isAudioAvailable) theme.primary else theme.primary.copy(alpha = 0.3f)

                Icon(playIcon, contentDescription = "Play Surah", Modifier.size(32.dp).clickable { onPlaySurah() }, tint = iconTint)

                Spacer(Modifier.width(6.dp))

                val focusIcon: ImageVector
                val focusIconTint: Color
                val isFocusClickable: Boolean

                if (!isSurahPlaying) {
                    focusIcon = Icons.Default.GpsNotFixed
                    focusIconTint = Color.LightGray.copy(alpha = 0.5f)
                    isFocusClickable = false
                } else if (!isAutoTracking) {
                    focusIcon = Icons.Default.GpsNotFixed
                    focusIconTint = theme.primary
                    isFocusClickable = true
                } else {
                    focusIcon = Icons.Default.GpsFixed
                    focusIconTint = theme.primary
                    isFocusClickable = true
                }

                Icon(imageVector = focusIcon, contentDescription = "Auto Focus", modifier = Modifier.size(22.dp).clickable(enabled = isFocusClickable) { onToggleAutoTrack() }, tint = focusIconTint)
            }
            Spacer(Modifier.width(8.dp))
            Text(myanmarTitle, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = theme.primary, textAlign = TextAlign.Center, maxLines = 2, lineHeight = 20.sp, modifier = Modifier.weight(1f))
        }
    }
}