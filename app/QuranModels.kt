package com.quranmm.app

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import com.quranmm.app.R // သင့် Project ရဲ့ R file ကို ချိတ်ဆက်ရန်

// 🚀 Data Models
data class SurahMenuData(val id: Int, val nameMM: String, val isAvailable: Boolean)
data class SurahInfo(val id: Int, val arabicName: String, val englishName: String, val totalAyats: Int)
data class AyatData(val ayatNumber: String, val multiAyats: String, val translation: String)
data class ArabicData(val ayatNumber: Int, val arabicText: String)
data class NoteData(val noteId: String, val noteText: String)

// 🚀 HISTORY STEP DATA MODEL
data class JumpStep(val surahId: Int, val ayatId: Int, val scrollIndex: Int, val scrollOffset: Int)

data class UpdateInfo(
    val version_code: Int,
    val version_name: String,
    val apk_url: String
)

// 🚀 Quranic Font Setup
val QuranFont = FontFamily(
    Font(R.font.muhammadi_quran)
)