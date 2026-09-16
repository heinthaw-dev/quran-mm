package com.quranmm.app

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.collectIsDraggedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.text.ClickableText
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.Locale

// 🚀 SETTINGS MANAGER
class SettingsManager(context: Context) {
    private val prefs = context.getSharedPreferences("QuranMMSettings", Context.MODE_PRIVATE)

    var isContinuousSwipe: Boolean
        get() = prefs.getBoolean("continuous_swipe", false)
        set(value) = prefs.edit().putBoolean("continuous_swipe", value).apply()

    var isRememberLastRead: Boolean
        get() = prefs.getBoolean("remember_last_read", false)
        set(value) = prefs.edit().putBoolean("remember_last_read", value).apply()

    var lastReadSurah: Int
        get() = prefs.getInt("last_read_surah", 1)
        set(value) = prefs.edit().putInt("last_read_surah", value).apply()

    var lastReadAyat: Int
        get() = prefs.getInt("last_read_ayat", 1)
        set(value) = prefs.edit().putInt("last_read_ayat", value).apply()

    var appTheme: String
        get() = prefs.getString("app_theme", "BLUE") ?: "BLUE"
        set(value) = prefs.edit().putString("app_theme", value).apply()

    var isAllAudioDownloaded: Boolean
        get() = prefs.getBoolean("all_audio_downloaded", false)
        set(value) = prefs.edit().putBoolean("all_audio_downloaded", value).apply()
}

// 🚀 THEME SETUP - Changed RED to PINK safely!
enum class AppTheme(val primary: Color, val bg: Color, val card: Color) {
    BLUE(Color(0xFF4B559C), Color(0xFFF0F4F8), Color(0xFFD4E6FF)),
    GREEN(Color(0xFF2E7D32), Color(0xFFE8F5E9), Color(0xFFC8E6C9)),
    PINK(Color(0xFFD81B60), Color(0xFFFCE4EC), Color(0xFFF8BBD0)),
    BROWN(Color(0xFF5D4037), Color(0xFFEFEBE9), Color(0xFFD7CCC8))
}

// 🚀 CUSTOM ICONS
val CustomDownloadIcon: ImageVector
    get() = ImageVector.Builder(
        name = "CustomDownload", defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 24f, viewportHeight = 24f
    ).apply {
        addPath(
            pathData = PathParser().parsePathString("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-11h2v5.58l2.71-2.71 1.41 1.41L12 17.41 7.88 13.29l1.41-1.41L11 14.58z").toNodes(),
            fill = SolidColor(Color.Black)
        )
    }.build()

// 🚀 PARSERS
fun parseCsvLine(line: String): List<String> {
    val result = mutableListOf<String>()
    val current = java.lang.StringBuilder()
    var inQuotes = false
    for (char in line) {
        if (char == '\"') {
            inQuotes = !inQuotes
        } else if (char == ',' && !inQuotes) {
            result.add(current.toString().trim())
            current.clear()
        } else {
            current.append(char)
        }
    }
    result.add(current.toString().trim())
    return result
}

fun parseAyatIds(multiString: String): List<Int> {
    return try {
        val cleanStr = multiString.replace(Regex("[^0-9-]"), "")
        if (cleanStr.contains("-")) {
            val p = cleanStr.split("-")
            (p[0].toInt()..p[1].toInt()).toList()
        } else {
            listOf(cleanStr.toInt())
        }
    } catch (e: Exception) {
        emptyList()
    }
}

// 🚀 Data Models
data class SurahMenuData(val id: Int, val nameMM: String, val isAvailable: Boolean)
data class SurahInfo(val id: Int, val arabicName: String, val englishName: String, val totalAyats: Int)
data class AyatData(val ayatNumber: String, val multiAyats: String, val translation: String)
data class ArabicData(val ayatNumber: Int, val arabicText: String)
data class NoteData(val noteId: String, val noteText: String)

// 🚀 HISTORY STEP DATA MODEL
data class JumpStep(val surahId: Int, val ayatId: Int, val scrollIndex: Int, val scrollOffset: Int)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val settingsManager = SettingsManager(this)
        setContent { QuranMMSplashWrapper(settingsManager) }
    }
}

@Composable
fun QuranMMSplashWrapper(settingsManager: SettingsManager) {
    var showSplash by remember { mutableStateOf(true) }

    // 🚀 CRASH FIX: Safe loading of the Theme Memory
    val activeTheme = remember {
        try {
            AppTheme.valueOf(settingsManager.appTheme)
        } catch (e: Exception) {
            AppTheme.BLUE
        }
    }

    LaunchedEffect(Unit) {
        delay(2000)
        showSplash = false
    }

    if (showSplash) {
        Box(
            modifier = Modifier.fillMaxSize().background(activeTheme.bg),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.kw_logo),
                contentDescription = "App Logo",
                modifier = Modifier.fillMaxWidth(0.9f)
            )
        }
    } else {
        QuranMMApp(settingsManager)
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun QuranMMApp(settingsManager: SettingsManager) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val softPinkUI = Color(0xFFD81B60)

    var currentTheme by remember {
        mutableStateOf(
            try {
                AppTheme.valueOf(settingsManager.appTheme)
            } catch (e: Exception) {
                AppTheme.BLUE
            }
        )
    }
    var isContinuousSwipe by remember { mutableStateOf(settingsManager.isContinuousSwipe) }
    var isRememberLastRead by remember { mutableStateOf(settingsManager.isRememberLastRead) }

    val surahPlayer = remember { ExoPlayer.Builder(context).build() }
    val ayatPlayer = remember { ExoPlayer.Builder(context).build() }

    var arabicFontScale by remember { mutableFloatStateOf(1f) }
    var myanmarFontScale by remember { mutableFloatStateOf(1f) }
    var noteFontScale by remember { mutableFloatStateOf(1f) }

    var isSurahPlaying by remember { mutableStateOf(false) }
    var isAyatPlaying by remember { mutableStateOf(false) }
    var loadedAyatIndex by remember { mutableIntStateOf(-1) }

    // Auto-Focus Tracking Engine State
    var isAutoTracking by remember { mutableStateOf(false) }
    var currentSurahTrackIndex by remember { mutableIntStateOf(-1) }
    var surahAudioTrackToPageMap by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }

    var showSurahDialog by remember { mutableStateOf(false) }
    var showAyatKeypad by remember { mutableStateOf(false) }
    var targetSurahForAyatKeypad by remember { mutableIntStateOf(-1) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var ayatInputValue by remember { mutableStateOf("") }

    var showInfoDialog by remember { mutableStateOf(false) }
    var infoDialogTitle by remember { mutableStateOf("") }
    var infoDialogUrl by remember { mutableStateOf("") }

    var jumpHistory by remember { mutableStateOf<List<JumpStep>>(emptyList()) }
    var isHistoryActive by remember { mutableStateOf(false) }

    var pendingScrollIndex by remember { mutableIntStateOf(-1) }
    var pendingScrollOffset by remember { mutableIntStateOf(0) }
    var currentScrollIndex by remember { mutableIntStateOf(0) }
    var currentScrollOffset by remember { mutableIntStateOf(0) }
    var showHistoryDialog by remember { mutableStateOf(false) }

    var isLoadingSurah by remember { mutableStateOf(true) }

    var isScanning by remember { mutableStateOf(false) }
    var missingSurahs by remember { mutableStateOf<List<SurahMenuData>>(emptyList()) }
    var selectedForDownload by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var showDownloadSelectionDialog by remember { mutableStateOf(false) }

    var showDownloadDialog by remember { mutableStateOf(false) }
    var downloadSurahProgress by remember { mutableIntStateOf(1) }
    var downloadTotalSurahs by remember { mutableIntStateOf(1) }
    var downloadCurrentSurahId by remember { mutableIntStateOf(1) }
    var downloadAyatProgress by remember { mutableIntStateOf(0) }
    var downloadTotalAyats by remember { mutableIntStateOf(1) }
    var downloadEstimatedTime by remember { mutableStateOf("Calculating...") }

    var isDownloading by remember { mutableStateOf(false) }
    var isDownloadPaused by remember { mutableStateOf(false) }
    var downloadJob by remember { mutableStateOf<Job?>(null) }

    var deletableSurahs by remember { mutableStateOf<List<SurahMenuData>>(emptyList()) }
    var selectedForDelete by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var showDeleteSelectionDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var deleteSurahProgress by remember { mutableIntStateOf(1) }
    var deleteTotalSurahs by remember { mutableIntStateOf(1) }
    var deleteJob by remember { mutableStateOf<Job?>(null) }
    var audioFileRefreshTrigger by remember { mutableIntStateOf(0) }

    // 🚀 NEW: Update Checker State
    var updateApkUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            try {
                // Get the app's current version code from Android System
                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= 28) pInfo.longVersionCode.toInt() else pInfo.versionCode

                // Read the tiny JSON file from your server's new APK folder
                val jsonStr = java.net.URL("http://38.247.64.94/uploads/APK/update.json").readText()

                // Extract the numbers using simple Regex
                val remoteVersionCode = Regex("\"version_code\"\\s*:\\s*(\\d+)").find(jsonStr)?.groupValues?.get(1)?.toIntOrNull() ?: 0
                val apkUrl = Regex("\"apk_url\"\\s*:\\s*\"([^\"]+)\"").find(jsonStr)?.groupValues?.get(1)

                if (remoteVersionCode > currentVersionCode && apkUrl != null) {
                    withContext(Dispatchers.Main) { updateApkUrl = apkUrl }
                }
            } catch (e: Exception) {
                // 🚀 SILENT FAIL: The Toast messages are gone!
                // If there's no internet or no update, it will stay invisible and won't crash.
            }
        }
    }

    DisposableEffect(surahPlayer, ayatPlayer) {
        val surahListener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                isSurahPlaying = isPlaying
            }
            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                currentSurahTrackIndex = surahPlayer.currentMediaItemIndex
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                // Not strictly needed for surah track memory clear, but good for completeness
            }
        }
        val ayatListener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                isAyatPlaying = isPlaying
            }
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED) {
                    loadedAyatIndex = -1
                }
            }
        }
        surahPlayer.addListener(surahListener)
        ayatPlayer.addListener(ayatListener)
        onDispose {
            surahPlayer.removeListener(surahListener)
            surahPlayer.release()
            ayatPlayer.removeListener(ayatListener)
            ayatPlayer.release()
        }
    }

    var menuItems by remember { mutableStateOf<List<SurahMenuData>>(emptyList()) }
    var surahInfoMap by remember { mutableStateOf<Map<Int, SurahInfo>>(emptyMap()) }

    var selectedSurahId by remember { mutableIntStateOf(if (settingsManager.isRememberLastRead) settingsManager.lastReadSurah else 1) }
    var pendingJumpToVerse by remember { mutableIntStateOf(if (settingsManager.isRememberLastRead) settingsManager.lastReadAyat else -1) }

    var surahLines by remember { mutableStateOf<List<AyatData>>(emptyList()) }
    var arabicAyahs by remember { mutableStateOf<List<ArabicData>>(emptyList()) }
    var explanationNotes by remember { mutableStateOf<List<NoteData>>(emptyList()) }

    var isWholeSurahAudioAvailable by remember { mutableStateOf(false) }
    val ayatAudioAvailability = remember { mutableStateMapOf<Int, Boolean>() }

    val currentSurahIndex = menuItems.indexOfFirst { it.id == selectedSurahId }
    val hasPrevSurahPage = isContinuousSwipe && currentSurahIndex > 0
    val hasNextSurahPage = isContinuousSwipe && currentSurahIndex < menuItems.size - 1

    val pagerState = rememberPagerState(pageCount = {
        val baseSize = surahLines.size
        if (baseSize == 0) 1 else { baseSize + (if (hasPrevSurahPage) 1 else 0) + (if (hasNextSurahPage) 1 else 0) }
    })
    val currentAyatIndex = if (hasPrevSurahPage) (pagerState.currentPage - 1).coerceAtLeast(0) else pagerState.currentPage

    val isDragged by pagerState.interactionSource.collectIsDraggedAsState()
    LaunchedEffect(isDragged) {
        if (isDragged) {
            isAutoTracking = false
        }
    }

    LaunchedEffect(currentSurahTrackIndex, isAutoTracking) {
        if (isAutoTracking && isSurahPlaying) {
            val targetPage = surahAudioTrackToPageMap[currentSurahTrackIndex]
            if (targetPage != null && pagerState.currentPage != targetPage) {
                pagerState.animateScrollToPage(targetPage)
            }
        }
    }

    val activateHistoryIfNeeded = {
        if (!isHistoryActive) {
            isHistoryActive = true
            val currentActualAyat = surahLines.getOrNull(currentAyatIndex)?.multiAyats?.split("-")?.firstOrNull()?.trim()?.toIntOrNull() ?: 1
            jumpHistory = listOf(JumpStep(selectedSurahId, currentActualAyat, currentScrollIndex, currentScrollOffset))
        }
    }

    LaunchedEffect(selectedSurahId, pagerState.settledPage, surahLines, isLoadingSurah, pagerState.isScrollInProgress) {
        delay(500)
        if (isHistoryActive && surahLines.isNotEmpty() && !isLoadingSurah && pendingJumpToVerse == -1 && !pagerState.isScrollInProgress) {
            val actualAyatIndex = if (hasPrevSurahPage) (pagerState.settledPage - 1).coerceAtLeast(0) else pagerState.settledPage
            if (actualAyatIndex in surahLines.indices) {
                val currentActualAyat = surahLines[actualAyatIndex].multiAyats.split("-").firstOrNull()?.trim()?.toIntOrNull() ?: 1
                val firstStep = jumpHistory.firstOrNull()

                if (firstStep != null) {
                    if (firstStep.surahId == selectedSurahId && firstStep.ayatId == currentActualAyat) {
                        jumpHistory = emptyList()
                        isHistoryActive = false
                    } else {
                        val lastStep = jumpHistory.lastOrNull()
                        if (lastStep == null || lastStep.surahId != selectedSurahId || lastStep.ayatId != currentActualAyat) {
                            val newStep = JumpStep(selectedSurahId, currentActualAyat, currentScrollIndex, currentScrollOffset)
                            val others = jumpHistory.drop(1).filterNot { it.surahId == newStep.surahId && it.ayatId == newStep.ayatId }
                            jumpHistory = listOf(firstStep) + others + listOf(newStep)
                        }
                    }
                }
            }
        }
    }

    val executeJump: (Int, Int, Int, Int) -> Unit = { targetSurah, targetAyat, targetScrollIndex, targetScrollOffset ->
        isAutoTracking = false
        if (targetSurah == selectedSurahId) {
            val safeIdx = maxOf(0, surahLines.indexOfFirst { parseAyatIds(it.multiAyats).contains(targetAyat) })
            val targetPage = if (hasPrevSurahPage) safeIdx + 1 else safeIdx
            scope.launch {
                pagerState.animateScrollToPage(targetPage)
                if (targetScrollIndex != -1) {
                    pendingScrollIndex = targetScrollIndex
                    pendingScrollOffset = targetScrollOffset
                }
            }
        } else {
            selectedSurahId = targetSurah
            pendingJumpToVerse = targetAyat
            if (targetScrollIndex != -1) {
                pendingScrollIndex = targetScrollIndex
                pendingScrollOffset = targetScrollOffset
            }
        }
    }

    val startFullDownload: (List<Int>) -> Unit = { targetSurahs ->
        isDownloading = true
        isDownloadPaused = false
        showDownloadDialog = true
        downloadEstimatedTime = "Calculating..."

        downloadJob = scope.launch(Dispatchers.IO) {
            val targetSurahsList = targetSurahs.sorted()
            var totalAyatsToDownload = 0
            val surahToAyatsMap = mutableMapOf<Int, List<Int>>()
            val surahToTotalAyatsMap = mutableMapOf<Int, Int>()

            for (sId in targetSurahsList) {
                val folderId = sId.toString().padStart(3, '0')
                val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")
                val requiredIds = mutableSetOf<Int>()

                try {
                    context.assets.open("$folderId.csv").bufferedReader().useLines { lines ->
                        lines.drop(1).forEach { line ->
                            val t = parseCsvLine(line)
                            if (t.size >= 2) requiredIds.addAll(parseAyatIds(if (t.size >= 3 && t[2].isNotBlank()) t[2].replace("\uFEFF", "").trim() else t[0].replace("\uFEFF", "").trim()))
                        }
                    }
                } catch(e: Exception){ }

                if (requiredIds.isEmpty()) {
                    val fallbackTotal = surahInfoMap[sId]?.totalAyats ?: 1
                    requiredIds.addAll(1..fallbackTotal)
                    if (sId == 1) requiredIds.add(0)
                }
                surahToTotalAyatsMap[sId] = requiredIds.size

                val missingIds = requiredIds.filter { id ->
                    val checkFile = File(dir, "$folderId${id.toString().padStart(3, '0')}.mp3")
                    !checkFile.exists() || checkFile.length() == 0L
                }
                surahToAyatsMap[sId] = missingIds
                totalAyatsToDownload += missingIds.size
            }

            var downloadedCount = 0
            val startTime = System.currentTimeMillis()
            var completedSurahsCount = 0

            for (sId in targetSurahsList) {
                while (isDownloadPaused) { delay(500) }
                if (!isActive) break

                val missingIds = surahToAyatsMap[sId] ?: emptyList()
                if (missingIds.isEmpty()) { completedSurahsCount++; continue }

                val totalForThisSurah = surahToTotalAyatsMap[sId] ?: missingIds.size
                val alreadyDownloadedCount = totalForThisSurah - missingIds.size

                val folderId = sId.toString().padStart(3, '0')
                val baseUrl = "http://38.247.64.94/uploads/Quran_32kbps/$folderId"
                val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId").apply { mkdirs() }

                withContext(Dispatchers.Main) {
                    downloadSurahProgress = completedSurahsCount + 1
                    downloadTotalSurahs = targetSurahsList.size
                    downloadCurrentSurahId = sId
                    downloadTotalAyats = totalForThisSurah
                }

                missingIds.forEachIndexed { idx, id ->
                    while (isDownloadPaused) { delay(500) }
                    if (!isActive) return@forEachIndexed

                    withContext(Dispatchers.Main) { downloadAyatProgress = alreadyDownloadedCount + idx + 1 }

                    val fileName = "$folderId${id.toString().padStart(3, '0')}.mp3"
                    val localFile = File(dir, fileName)
                    try {
                        java.net.URL("$baseUrl/$fileName").openConnection().apply {
                            connectTimeout = 5000
                            readTimeout = 5000
                            connect()
                        }.getInputStream().use { input ->
                            java.io.FileOutputStream(localFile).use { output -> input.copyTo(output) }
                        }
                        downloadedCount++
                        val elapsedSec = (System.currentTimeMillis() - startTime) / 1000.0
                        if (elapsedSec > 2.0 && downloadedCount > 0) {
                            val etaSec = ((totalAyatsToDownload - downloadedCount) / (downloadedCount / elapsedSec)).toInt()
                            withContext(Dispatchers.Main) {
                                downloadEstimatedTime = String.format("%02d:%02d mins remaining", etaSec / 60, etaSec % 60)
                            }
                        }
                    } catch (e: Exception) {
                        if (localFile.exists()) localFile.delete()
                    }
                }
                completedSurahsCount++
            }
            if (isActive && !isDownloadPaused) {
                withContext(Dispatchers.Main) {
                    isDownloading = false
                    showDownloadDialog = false
                    audioFileRefreshTrigger++
                }
            }
        }
    }

    val startDeleteProcess: (List<Int>) -> Unit = { targetSurahs ->
        isDeleting = true
        showDeleteDialog = true
        deleteJob = scope.launch(Dispatchers.IO) {
            val targetList = targetSurahs.sorted()
            var completed = 0
            for (sId in targetList) {
                if (!isActive) break
                withContext(Dispatchers.Main) {
                    deleteSurahProgress = completed + 1
                    deleteTotalSurahs = targetList.size
                }
                val folderId = sId.toString().padStart(3, '0')
                val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")
                if (dir.exists()) {
                    dir.listFiles()?.forEach { it.delete() }
                    dir.delete()
                }
                completed++
                delay(100)
            }
            withContext(Dispatchers.Main) {
                isDeleting = false
                showDeleteDialog = false
                audioFileRefreshTrigger++
            }
        }
    }

    val handleJumpClick: (Int, Int) -> Unit = { targetSurah, targetAyat ->
        if (menuItems.any { it.id == targetSurah }) {
            activateHistoryIfNeeded()
            executeJump(targetSurah, targetAyat, -1, 0)
        } else {
            Toast.makeText(context, "Surah Not Found", Toast.LENGTH_SHORT).show()
        }
    }

    LaunchedEffect(selectedSurahId, pagerState.currentPage) {
        if (isRememberLastRead && surahLines.isNotEmpty() && currentAyatIndex < surahLines.size && pendingJumpToVerse == -1) {
            settingsManager.lastReadSurah = selectedSurahId
            val actualAyatNum = surahLines.getOrNull(currentAyatIndex)?.multiAyats?.split("-")?.firstOrNull()?.trim()?.toIntOrNull() ?: 1
            settingsManager.lastReadAyat = actualAyatNum
        }
    }

    LaunchedEffect(pagerState.currentPage, pagerState.isScrollInProgress) {
        if (!pagerState.isScrollInProgress && surahLines.isNotEmpty() && pendingJumpToVerse == -1) {
            val actualAyatIndex = if (hasPrevSurahPage) pagerState.currentPage - 1 else pagerState.currentPage
            if (actualAyatIndex < 0 && isContinuousSwipe && currentSurahIndex > 0) {
                pendingJumpToVerse = 9999
                selectedSurahId = menuItems[currentSurahIndex - 1].id
            }
            else if (actualAyatIndex >= surahLines.size && isContinuousSwipe && currentSurahIndex < menuItems.size - 1) {
                pendingJumpToVerse = 8888
                selectedSurahId = menuItems[currentSurahIndex + 1].id
            }
        }
    }

    LaunchedEffect(Unit) { drawerState.snapTo(DrawerValue.Closed) }
    LaunchedEffect(pagerState.currentPage) { ayatPlayer.stop() }

    LaunchedEffect(Unit) {
        val availableIds = mutableSetOf<Int>()
        try {
            context.assets.list("")?.forEach {
                if (it.endsWith(".csv") && !it.contains("_"))
                    availableIds.add(it.replace(".csv", "").toIntOrNull() ?: 0)
            }
        } catch (e: Exception) { }

        val tempMenu = mutableListOf<SurahMenuData>()
        try {
            context.assets.open("surah_mm_name.csv").bufferedReader().useLines { lines ->
                lines.drop(1).forEach {
                    val t = parseCsvLine(it)
                    if (t.size >= 2) {
                        val id = t[0].replace("\uFEFF", "").trim().toIntOrNull() ?: 0
                        if (availableIds.contains(id)) tempMenu.add(SurahMenuData(id, t[1], true))
                    }
                }
            }
        } catch (e: Exception) { }

        availableIds.forEach { id ->
            if (!tempMenu.any { it.id == id }) { tempMenu.add(SurahMenuData(id, "Surah $id", true)) }
        }
        tempMenu.sortBy { it.id }

        if (!tempMenu.any { it.id == 1 }) { tempMenu.add(0, SurahMenuData(1, "Al-Fatiha", true)) }

        if (tempMenu.isNotEmpty()) {
            menuItems = tempMenu
            if (!isRememberLastRead && !tempMenu.any { it.id == selectedSurahId }) {
                selectedSurahId = tempMenu.first().id
            }
        }

        val tempInfo = mutableMapOf<Int, SurahInfo>()
        try {
            context.assets.open("quran_surahs.csv").bufferedReader().useLines { lines ->
                lines.drop(1).forEach {
                    val t = parseCsvLine(it)
                    if (t.size >= 5) {
                        val id = t[0].replace("\uFEFF", "").trim().toIntOrNull() ?: 0
                        tempInfo[id] = SurahInfo(id, t[1], t[2], t[4].toIntOrNull() ?: 0)
                    }
                }
            }
        } catch (e: Exception) { }
        surahInfoMap = tempInfo
    }

    LaunchedEffect(selectedSurahId) {
        isLoadingSurah = true
        isAutoTracking = false
        surahPlayer.stop()
        surahPlayer.clearMediaItems()
        ayatPlayer.stop()
        ayatPlayer.clearMediaItems()
        loadedAyatIndex = -1

        val prefix3 = selectedSurahId.toString().padStart(3, '0')

        surahLines = try {
            context.assets.open("$prefix3.csv").bufferedReader().useLines { lines ->
                lines.drop(1).mapNotNull { line ->
                    val t = parseCsvLine(line)
                    if (t.size >= 2) AyatData(t[0].replace("\uFEFF", "").trim(), if (t.size >= 3 && t[2].isNotBlank()) t[2].replace("\uFEFF", "").trim() else t[0].replace("\uFEFF", "").trim(), t[1].trim()) else null
                }.toList()
            }
        } catch (e: Exception) { emptyList() }

        explanationNotes = try {
            context.assets.open("${prefix3}_notes.csv").bufferedReader().useLines { lines ->
                lines.drop(1).mapNotNull { line -> val t = parseCsvLine(line); if (t.size >= 2) NoteData(t[0].replace("\uFEFF", "").trim(), t[1].trim()) else null }.toList()
            }
        } catch (e: Exception) { emptyList() }

        arabicAyahs = try {
            context.assets.open("Quran_Dataset.csv").bufferedReader().useLines { lines ->
                lines.drop(1).mapNotNull { line -> val t = parseCsvLine(line); if (t.size >= 3 && t[0].replace("\uFEFF", "").trim().toIntOrNull() == selectedSurahId) ArabicData(t[1].trim().toIntOrNull() ?: 0, t[2]) else null }.toList()
            }
        } catch (e: Exception) { emptyList() }

        isLoadingSurah = false
        audioFileRefreshTrigger++
    }

    LaunchedEffect(audioFileRefreshTrigger, surahLines) {
        if (surahLines.isEmpty()) return@LaunchedEffect

        val folderId = selectedSurahId.toString().padStart(3, '0')
        val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")

        var allSurahComplete = true
        ayatAudioAvailability.clear()

        if (selectedSurahId != 1 && selectedSurahId != 9) {
            val bismillahFile = File(context.filesDir, "audio/Quran_32kbps/001/001000.mp3")
            val bismillahFileAlt = File(context.filesDir, "audio/Quran_32kbps/001/000000.mp3")
            val hasBismillah = (bismillahFile.exists() && bismillahFile.length() > 0) || (bismillahFileAlt.exists() && bismillahFileAlt.length() > 0)
            if (!hasBismillah) allSurahComplete = false
        }

        surahLines.forEachIndexed { index, line ->
            val ids = parseAyatIds(line.multiAyats)
            var ayatComplete = true
            ids.forEach { id ->
                val ayatId = id.toString().padStart(3, '0')
                val checkFile = File(dir, "$folderId$ayatId.mp3")
                if (!checkFile.exists() || checkFile.length() == 0L) {
                    ayatComplete = false
                    allSurahComplete = false
                }
            }
            ayatAudioAvailability[index] = ayatComplete
        }
        isWholeSurahAudioAvailable = allSurahComplete
    }

    LaunchedEffect(surahLines) {
        if (surahLines.isNotEmpty()) {
            val newSurahIdx = menuItems.indexOfFirst { it.id == selectedSurahId }
            val newHasPrev = isContinuousSwipe && newSurahIdx > 0
            if (pendingJumpToVerse != -1) {
                val targetPage = if (pendingJumpToVerse == 9999) {
                    if (newHasPrev) surahLines.size else surahLines.size - 1
                } else if (pendingJumpToVerse == 8888) {
                    if (newHasPrev) 1 else 0
                } else {
                    val targetIdx = surahLines.indexOfFirst { parseAyatIds(it.multiAyats).contains(pendingJumpToVerse) }
                    val safeIdx = if (targetIdx != -1) targetIdx else 0
                    if (newHasPrev) safeIdx + 1 else safeIdx
                }
                delay(100)
                pagerState.scrollToPage(targetPage)
                pendingJumpToVerse = -1
            } else {
                val startPage = if (newHasPrev) 1 else 0
                if (pagerState.currentPage != startPage) {
                    delay(50)
                    pagerState.scrollToPage(startPage)
                }
            }
        }
    }

    val currentTopAyat = surahLines.getOrNull(currentAyatIndex)
    val topMultiString = currentTopAyat?.multiAyats ?: "1"
    val topTargetIds = parseAyatIds(topMultiString)

    val copyToClip = { text: String ->
        clipboardManager.setText(AnnotatedString(text))
        Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
    }

    val toggleAudio: () -> Unit = {
        isAutoTracking = false
        if (ayatPlayer.isPlaying) {
            ayatPlayer.pause()
        } else {
            surahPlayer.pause()
            if (loadedAyatIndex != pagerState.currentPage || ayatPlayer.mediaItemCount == 0 || ayatPlayer.playbackState == Player.STATE_IDLE) {
                ayatPlayer.stop()
                ayatPlayer.clearMediaItems()
                val folderId = selectedSurahId.toString().padStart(3, '0')
                var missingAudio = false

                topTargetIds.forEach { id ->
                    val ayatId = id.toString().padStart(3, '0')
                    val localFile = File(context.filesDir, "audio/Quran_32kbps/$folderId/$folderId$ayatId.mp3")
                    if (localFile.exists() && localFile.length() > 0) {
                        ayatPlayer.addMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(localFile).toString()))
                    } else {
                        missingAudio = true
                    }
                }

                if (!missingAudio) {
                    ayatPlayer.prepare()
                    loadedAyatIndex = pagerState.currentPage
                    ayatPlayer.play()
                }
            } else {
                if (ayatPlayer.playbackState == Player.STATE_ENDED) {
                    ayatPlayer.seekTo(0)
                } else {
                    val rewindPos = (ayatPlayer.currentPosition - 1500).coerceAtLeast(0)
                    ayatPlayer.seekTo(rewindPos)
                }
                ayatPlayer.play()
            }
        }
    }

    val toggleSurahAudio: () -> Unit = {
        if (surahPlayer.isPlaying) {
            surahPlayer.pause()
        } else {
            ayatPlayer.pause()
            if (surahPlayer.mediaItemCount == 0 || surahPlayer.playbackState == Player.STATE_IDLE) {
                surahPlayer.stop()
                surahPlayer.clearMediaItems()
                val folderId = selectedSurahId.toString().padStart(3, '0')
                var missingAudio = false
                val tempMap = mutableMapOf<Int, Int>()
                var mediaIdx = 0

                if (selectedSurahId != 1 && selectedSurahId != 9) {
                    val bismillahFile = File(context.filesDir, "audio/Quran_32kbps/001/001000.mp3")
                    val bismillahFileAlt = File(context.filesDir, "audio/Quran_32kbps/001/000000.mp3")
                    val fileToUse = if (bismillahFile.exists() && bismillahFile.length() > 0) bismillahFile else if (bismillahFileAlt.exists() && bismillahFileAlt.length() > 0) bismillahFileAlt else null
                    if (fileToUse != null) {
                        surahPlayer.addMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(fileToUse).toString()))
                        tempMap[mediaIdx] = if (hasPrevSurahPage) 1 else 0
                        mediaIdx++
                    } else {
                        missingAudio = true
                    }
                }

                surahLines.forEachIndexed { index, line ->
                    val pageIdx = if (hasPrevSurahPage) index + 1 else index
                    val ids = parseAyatIds(line.multiAyats)
                    ids.forEach { id ->
                        val ayatId = id.toString().padStart(3, '0')
                        val localFile = File(context.filesDir, "audio/Quran_32kbps/$folderId/$folderId$ayatId.mp3")
                        if (localFile.exists() && localFile.length() > 0) {
                            surahPlayer.addMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(localFile).toString()))
                            tempMap[mediaIdx] = pageIdx
                            mediaIdx++
                        } else {
                            missingAudio = true
                        }
                    }
                }
                if (!missingAudio) {
                    surahAudioTrackToPageMap = tempMap
                    currentSurahTrackIndex = 0
                    surahPlayer.prepare()
                    surahPlayer.play()
                }
            } else {
                currentSurahTrackIndex = surahPlayer.currentMediaItemIndex
                if (surahPlayer.playbackState == Player.STATE_ENDED) {
                    surahPlayer.seekTo(0, 0)
                } else {
                    val rewindPos = (surahPlayer.currentPosition - 1500).coerceAtLeast(0)
                    surahPlayer.seekTo(rewindPos)
                }
                surahPlayer.play()
            }
        }
    }

    if (isScanning) {
        Dialog(onDismissRequest = {}) {
            Box(
                modifier = Modifier.background(Color.White, RoundedCornerShape(8.dp)).padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = currentTheme.primary)
                    Spacer(Modifier.height(16.dp))
                    Text("Scanning available files...", color = currentTheme.primary)
                }
            }
        }
    }

    if (showDownloadSelectionDialog) {
        AlertDialog(
            onDismissRequest = { showDownloadSelectionDialog = false },
            containerColor = currentTheme.bg,
            title = {
                Column {
                    Text(text = "Select Surahs to Download", fontWeight = FontWeight.Bold, color = currentTheme.primary, fontSize = 16.sp, maxLines = 1)
                    if (missingSurahs.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        val isAllSelected = selectedForDownload.size == missingSurahs.size
                        Text(
                            text = if (isAllSelected) "Uncheck All" else "Check All",
                            fontSize = 14.sp,
                            color = Color(0xFF1976D2),
                            textDecoration = TextDecoration.Underline,
                            modifier = Modifier.clickable {
                                if (isAllSelected) {
                                    selectedForDownload = missingSurahs.filter { it.id == 1 }.map { it.id }.toSet()
                                } else {
                                    selectedForDownload = missingSurahs.map { it.id }.toSet()
                                }
                            }.padding(vertical = 4.dp)
                        )
                    }
                }
            },
            text = {
                if (missingSurahs.isEmpty()) {
                    Text("✅ All available Surahs have been successfully downloaded! You are ready for offline listening.", color = Color(0xFF2E7D32))
                } else {
                    Column(modifier = Modifier.heightIn(max = 400.dp)) {
                        LazyColumn(modifier = Modifier.weight(1f)) {
                            items(missingSurahs) { surah ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable(enabled = surah.id != 1) {
                                        if (selectedForDownload.contains(surah.id)) selectedForDownload -= surah.id else selectedForDownload += surah.id
                                    }.padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = selectedForDownload.contains(surah.id),
                                        onCheckedChange = { checked ->
                                            if (checked) selectedForDownload += surah.id else selectedForDownload -= surah.id
                                        },
                                        enabled = surah.id != 1
                                    )
                                    Text("Surah ${surah.id}: ${surah.nameMM}", color = if (surah.id == 1) Color.Gray else Color.Unspecified)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        val totalSizeMB = selectedForDownload.sumOf { (surahInfoMap[it]?.totalAyats ?: 0) * 0.0894 }
                        Text(text = "${selectedForDownload.size} Surah selected.", fontSize = 14.sp, color = Color.Gray)
                        Text(text = "Download size: ${String.format(Locale.US, "%.1f", totalSizeMB)} MB", fontWeight = FontWeight.Bold, color = currentTheme.primary, fontSize = 14.sp)
                    }
                }
            },
            confirmButton = {
                if (missingSurahs.isNotEmpty()) {
                    Button(
                        onClick = { showDownloadSelectionDialog = false; startFullDownload(selectedForDownload.toList()) },
                        enabled = selectedForDownload.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(containerColor = currentTheme.primary)
                    ) {
                        Text("Download Selected")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDownloadSelectionDialog = false }) {
                    Text("Close", color = currentTheme.primary)
                }
            }
        )
    }

    if (showDownloadDialog) {
        AlertDialog(
            onDismissRequest = { if (!isDownloading) showDownloadDialog = false },
            containerColor = currentTheme.bg,
            title = { Text("Downloading Audio", fontWeight = FontWeight.Bold, color = currentTheme.primary) },
            text = {
                Column {
                    Text("Downloading selected Surahs for offline listening. Please keep the app open.", fontSize = 14.sp, color = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    if (isDownloading || isDownloadPaused) {
                        Text("Surah Progress: $downloadSurahProgress / $downloadTotalSurahs", color = currentTheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("(Downloading Surah $downloadCurrentSurahId)", color = currentTheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        val surahProg = if (downloadTotalSurahs > 0) downloadSurahProgress.toFloat() / downloadTotalSurahs else 0f
                        LinearProgressIndicator(progress = surahProg, modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp), color = currentTheme.primary)

                        Text("Ayat Progress: $downloadAyatProgress / $downloadTotalAyats", color = currentTheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        val ayatProg = if (downloadTotalAyats > 0) downloadAyatProgress.toFloat() / downloadTotalAyats else 0f
                        LinearProgressIndicator(progress = ayatProg, modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp), color = currentTheme.primary)

                        Text("ETA: $downloadEstimatedTime", color = currentTheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            },
            confirmButton = {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { isDownloadPaused = !isDownloadPaused },
                        colors = ButtonDefaults.buttonColors(containerColor = currentTheme.primary)
                    ) {
                        Text(if (isDownloadPaused) "Resume" else "Pause")
                    }
                    Button(
                        onClick = { downloadJob?.cancel(); isDownloading = false; isDownloadPaused = false; showDownloadDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = softPinkUI)
                    ) {
                        Text("Stop")
                    }
                }
            },
            dismissButton = null
        )
    }

    if (showDeleteSelectionDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteSelectionDialog = false },
            containerColor = currentTheme.bg,
            title = {
                Column {
                    Text(text = "Select Audio to Delete", fontWeight = FontWeight.Bold, color = softPinkUI, fontSize = 16.sp, maxLines = 1)
                    if (deletableSurahs.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        val isAllSelected = selectedForDelete.size == deletableSurahs.size
                        Text(
                            text = if (isAllSelected) "Uncheck All" else "Check All",
                            fontSize = 14.sp,
                            color = Color(0xFF1976D2),
                            textDecoration = TextDecoration.Underline,
                            modifier = Modifier.clickable {
                                if (isAllSelected) {
                                    selectedForDelete = emptySet()
                                } else {
                                    selectedForDelete = deletableSurahs.map { it.id }.toSet()
                                }
                            }.padding(vertical = 4.dp)
                        )
                    }
                }
            },
            text = {
                if (deletableSurahs.isEmpty()) {
                    Text("✅ No audio files found. Your storage is clean!", color = Color(0xFF2E7D32))
                } else {
                    Column(modifier = Modifier.heightIn(max = 400.dp)) {
                        LazyColumn(modifier = Modifier.weight(1f)) {
                            items(deletableSurahs) { surah ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable(enabled = surah.id != 1) {
                                        if (selectedForDelete.contains(surah.id)) selectedForDelete -= surah.id else selectedForDelete += surah.id
                                    }.padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = selectedForDelete.contains(surah.id),
                                        onCheckedChange = { checked ->
                                            if (checked) selectedForDelete += surah.id else selectedForDelete -= surah.id
                                        },
                                        enabled = surah.id != 1,
                                        colors = CheckboxDefaults.colors(checkedColor = softPinkUI)
                                    )
                                    Text("Surah ${surah.id}: ${surah.nameMM}", color = if (surah.id == 1) Color.Gray else Color.Unspecified)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        val totalDeleteSizeMB = remember(selectedForDelete) {
                            selectedForDelete.sumOf { sId ->
                                val folderId = sId.toString().padStart(3, '0')
                                val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")
                                (dir.listFiles()?.sumOf { it.length() } ?: 0L) / (1024.0 * 1024.0)
                            }
                        }
                        Text(text = "${selectedForDelete.size} Surah selected.", fontSize = 14.sp, color = Color.Gray)
                        Text(text = "Freed up size: ${String.format(Locale.US, "%.1f", totalDeleteSizeMB)} MB", fontWeight = FontWeight.Bold, color = softPinkUI, fontSize = 14.sp)
                    }
                }
            },
            confirmButton = {
                if (deletableSurahs.isNotEmpty()) {
                    Button(
                        onClick = { showDeleteSelectionDialog = false; startDeleteProcess(selectedForDelete.toList()) },
                        enabled = selectedForDelete.isNotEmpty(),
                        colors = ButtonDefaults.buttonColors(containerColor = softPinkUI)
                    ) {
                        Text("Delete Selected")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteSelectionDialog = false }) {
                    Text("Close", color = currentTheme.primary)
                }
            }
        )
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { },
            containerColor = currentTheme.bg,
            title = { Text("Deleting Audio...", fontWeight = FontWeight.Bold, color = softPinkUI) },
            text = {
                Column {
                    Text("Freeing up storage space.", fontSize = 14.sp, color = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    Text("Progress: $deleteSurahProgress / $deleteTotalSurahs", color = softPinkUI, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    val prog = if (deleteTotalSurahs > 0) deleteSurahProgress.toFloat() / deleteTotalSurahs else 0f
                    LinearProgressIndicator(progress = prog, modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp), color = softPinkUI)
                }
            },
            confirmButton = { },
            dismissButton = null
        )
    }

    if (showSurahDialog) {
        val listState = rememberLazyListState()
        LaunchedEffect(showSurahDialog) {
            if (showSurahDialog) {
                val index = menuItems.indexOfFirst { it.id == selectedSurahId }
                if (index >= 0) { listState.scrollToItem(index) }
            }
        }
        AlertDialog(
            onDismissRequest = { showSurahDialog = false },
            containerColor = currentTheme.bg,
            title = { Text("Select Surah", fontWeight = FontWeight.Bold, color = currentTheme.primary) },
            text = {
                LazyColumn(state = listState, modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)) {
                    items(menuItems) { surah ->
                        val info = surahInfoMap[surah.id]
                        ListItem(
                            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                            headlineContent = { Text("${surah.id}. ${info?.englishName ?: surah.nameMM}", color = currentTheme.primary, fontWeight = FontWeight.Bold) },
                            supportingContent = { Text(info?.arabicName ?: "", color = Color.Gray) },
                            modifier = Modifier.clickable {
                                isAutoTracking = false
                                targetSurahForAyatKeypad = surah.id
                                showSurahDialog = false
                                showAyatKeypad = true
                            }
                        )
                        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSurahDialog = false; showAyatKeypad = true }) {
                    Text("Select Ayat", color = currentTheme.primary)
                }
            }
        )
    }

    if (showAyatKeypad) {
        val activeSurahId = if (targetSurahForAyatKeypad != -1) targetSurahForAyatKeypad else selectedSurahId
        val maxAyats = surahInfoMap[activeSurahId]?.totalAyats ?: 1
        AlertDialog(
            onDismissRequest = { showAyatKeypad = false; ayatInputValue = ""; targetSurahForAyatKeypad = -1 },
            containerColor = currentTheme.bg,
            title = { Text("Jump to Ayat", fontWeight = FontWeight.Bold, color = currentTheme.primary) },
            text = {
                Column {
                    Text("Total Ayats in Surah: $maxAyats", fontSize = 14.sp, color = Color.Gray)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(
                        value = ayatInputValue,
                        onValueChange = { ayatInputValue = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        label = { Text("Enter Ayat Number") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = currentTheme.primary),
                    onClick = {
                        val targetAyat = ayatInputValue.toIntOrNull()
                        if (targetAyat != null) {
                            if (targetAyat > maxAyats || targetAyat < 1) {
                                ayatInputValue = ""
                                Toast.makeText(context, "Out of Total Ayats", Toast.LENGTH_SHORT).show()
                            } else {
                                executeJump(activeSurahId, targetAyat, -1, 0)
                                showAyatKeypad = false
                                ayatInputValue = ""
                                targetSurahForAyatKeypad = -1
                            }
                        }
                    }
                ) {
                    Text("Go")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAyatKeypad = false; ayatInputValue = ""; targetSurahForAyatKeypad = -1 }) {
                    Text("Cancel", color = currentTheme.primary)
                }
            }
        )
    }

    if (showThemeDialog) {
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            containerColor = currentTheme.bg,
            title = { Text("Select App Theme", color = currentTheme.primary, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    AppTheme.values().forEach { themeOption ->
                        ListItem(
                            colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                            headlineContent = {
                                Text(
                                    themeOption.name.lowercase(Locale.US).replaceFirstChar { it.titlecase(Locale.US) },
                                    color = themeOption.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            },
                            modifier = Modifier.clickable {
                                currentTheme = themeOption
                                settingsManager.appTheme = themeOption.name
                                showThemeDialog = false
                            }
                        )
                        HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showThemeDialog = false }) {
                    Text("Close", color = currentTheme.primary)
                }
            }
        )
    }

    if (showInfoDialog) {
        Dialog(onDismissRequest = { showInfoDialog = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Surface(modifier = Modifier.fillMaxSize().systemBarsPadding(), color = currentTheme.bg) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Back", tint = currentTheme.primary, modifier = Modifier.size(28.dp).clickable { showInfoDialog = false })
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(infoDialogTitle, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = currentTheme.primary, modifier = Modifier.weight(1f))
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = currentTheme.primary, modifier = Modifier.size(28.dp).clickable { showInfoDialog = false; scope.launch { drawerState.close() } })
                    }
                    HorizontalDivider(color = currentTheme.primary.copy(alpha = 0.3f))
                    Surface(modifier = Modifier.weight(1f).fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 64.dp), shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 4.dp) {
                        AndroidView(
                            factory = { ctx ->
                                android.webkit.WebView(ctx).apply {
                                    layoutParams = android.view.ViewGroup.LayoutParams(android.view.ViewGroup.LayoutParams.MATCH_PARENT, android.view.ViewGroup.LayoutParams.MATCH_PARENT)
                                    setBackgroundColor(android.graphics.Color.TRANSPARENT)
                                    loadUrl(infoDialogUrl)
                                }
                            },
                            update = { webView -> webView.loadUrl(infoDialogUrl) },
                            modifier = Modifier.clip(RoundedCornerShape(16.dp)).padding(12.dp)
                        )
                    }
                }
            }
        }
    }

    if (showHistoryDialog) {
        Dialog(onDismissRequest = { showHistoryDialog = false }) {
            Surface(shape = RoundedCornerShape(16.dp), color = currentTheme.bg, shadowElevation = 8.dp) {
                Column(modifier = Modifier.padding(top = 24.dp, bottom = 12.dp, start = 24.dp, end = 24.dp)) {
                    Text("Jump History", fontWeight = FontWeight.Bold, color = currentTheme.primary, fontSize = 20.sp)
                    Spacer(modifier = Modifier.height(16.dp))
                    LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f, fill = false).heightIn(max = 400.dp)) {
                        itemsIndexed(jumpHistory) { index, jump ->
                            val sInfo = surahInfoMap[jump.surahId]
                            val stepLabel = when {
                                index == 0 -> "Original Reading Spot"
                                index == jumpHistory.size - 1 -> "Current Spot"
                                else -> "Jump Step $index"
                            }
                            ListItem(
                                colors = ListItemDefaults.colors(containerColor = Color.Transparent),
                                headlineContent = { Text(text = stepLabel, color = currentTheme.primary, fontWeight = FontWeight.Bold) },
                                supportingContent = { Text("\u202A[Surah ${jump.surahId} : Ayat ${jump.ayatId}]\u202C ${sInfo?.englishName ?: ""}", color = Color.DarkGray) },
                                modifier = Modifier.clickable {
                                    isAutoTracking = false
                                    if (index == 0) {
                                        jumpHistory = emptyList()
                                        isHistoryActive = false
                                    } else {
                                        jumpHistory = jumpHistory.take(index + 1)
                                    }
                                    showHistoryDialog = false
                                    executeJump(jump.surahId, jump.ayatId, jump.scrollIndex, jump.scrollOffset)
                                }
                            )
                            HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        TextButton(onClick = { jumpHistory = emptyList(); isHistoryActive = false; showHistoryDialog = false }) { Text("Clear History", color = currentTheme.primary) }
                        TextButton(onClick = { showHistoryDialog = false }) { Text("Close", color = currentTheme.primary) }
                    }
                }
            }
        }
    }

    val openInfo = { title: String, url: String -> infoDialogTitle = title; infoDialogUrl = url; showInfoDialog = true }

    ModalNavigationDrawer(
        drawerState = drawerState, gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            if (drawerState.isOpen || drawerState.isAnimationRunning) {
                ModalDrawerSheet(modifier = Modifier.width(320.dp)) {
                    Column(modifier = Modifier.fillMaxWidth().background(Color.White).padding(start = 24.dp, end = 24.dp, top = 32.dp, bottom = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(painter = painterResource(id = R.drawable.kw_logo), contentDescription = "App Logo", modifier = Modifier.height(60.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("မြန်မာ ကုရ်အာန် ဘာသာပြန်", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = currentTheme.primary)
                        Spacer(Modifier.height(2.dp))
                        Text("ဆရာ ဦးကျော်ဝင်း", fontSize = 13.sp, color = currentTheme.primary)
                    }
                    HorizontalDivider()
                    LazyColumn(modifier = Modifier.fillMaxSize().background(currentTheme.bg)) {
                        item { Spacer(Modifier.height(8.dp)) }
                        item { Text("Audio Files", modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp), fontSize = 13.sp, color = Color.Gray, fontWeight = FontWeight.Bold) }
                        item {
                            MenuRow(icon = CustomDownloadIcon, title = "Downloads", theme = currentTheme, onClick = {
                                scope.launch {
                                    drawerState.close()
                                    isScanning = true
                                    withContext(Dispatchers.IO) {
                                        val missing = mutableListOf<SurahMenuData>()
                                        for (menuItem in menuItems) {
                                            val sId = menuItem.id
                                            val folderId = sId.toString().padStart(3, '0')
                                            val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")
                                            val requiredIds = mutableSetOf<Int>()
                                            val stream = try { context.assets.open("${folderId}.csv") } catch(e: Exception){ null }
                                            if (stream != null) {
                                                stream.bufferedReader().useLines { lines ->
                                                    lines.drop(1).forEach { line ->
                                                        val t = parseCsvLine(line)
                                                        if (t.size >= 2) {
                                                            val multi = if (t.size >= 3 && t[2].isNotBlank()) t[2].replace("\uFEFF", "").trim() else t[0].replace("\uFEFF", "").trim()
                                                            requiredIds.addAll(parseAyatIds(multi))
                                                        }
                                                    }
                                                }
                                            }
                                            if (requiredIds.isEmpty()) {
                                                val fallbackTotal = surahInfoMap[sId]?.totalAyats ?: 1
                                                requiredIds.addAll(1..fallbackTotal)
                                                if (sId == 1) requiredIds.add(0)
                                            }
                                            var isFullyDownloaded = true
                                            for (id in requiredIds.sorted()) {
                                                val fileId = id.toString().padStart(3, '0')
                                                val checkFile = File(dir, "$folderId$fileId.mp3")
                                                if (!checkFile.exists() || checkFile.length() == 0L) { isFullyDownloaded = false; break }
                                            }
                                            if (!isFullyDownloaded) { missing.add(menuItem) }
                                        }
                                        withContext(Dispatchers.Main) {
                                            isScanning = false
                                            missingSurahs = missing
                                            selectedForDownload = missing.map { it.id }.toSet()
                                            showDownloadSelectionDialog = true
                                        }
                                    }
                                }
                            })
                        }
                        item {
                            MenuRow(icon = Icons.Default.Delete, title = "Delete Downloads", theme = currentTheme, onClick = {
                                scope.launch {
                                    drawerState.close()
                                    isScanning = true
                                    withContext(Dispatchers.IO) {
                                        val found = mutableListOf<SurahMenuData>()
                                        for (menuItem in menuItems) {
                                            val sId = menuItem.id
                                            val folderId = sId.toString().padStart(3, '0')
                                            val dir = File(context.filesDir, "audio/Quran_32kbps/$folderId")
                                            if (dir.exists() && dir.list()?.isNotEmpty() == true) { found.add(menuItem) }
                                        }
                                        withContext(Dispatchers.Main) {
                                            isScanning = false
                                            deletableSurahs = found
                                            selectedForDelete = emptySet()
                                            showDeleteSelectionDialog = true
                                        }
                                    }
                                }
                            })
                        }
                        item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                        item { Text("App Settings", modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp), fontSize = 13.sp, color = Color.Gray, fontWeight = FontWeight.Bold) }
                        item { MenuRow(icon = Icons.Default.Create, title = "App Theme", subtitle = currentTheme.name, theme = currentTheme, onClick = { scope.launch { drawerState.close(); showThemeDialog = true } }) }
                        item {
                            MenuRow(icon = Icons.Default.ArrowForward, title = "Continuous Swiping", theme = currentTheme, onClick = {
                                val oldAyatIdx = currentAyatIndex
                                isContinuousSwipe = !isContinuousSwipe
                                settingsManager.isContinuousSwipe = isContinuousSwipe
                                scope.launch {
                                    val newHasPrev = isContinuousSwipe && currentSurahIndex > 0
                                    val targetPage = if (newHasPrev) oldAyatIdx + 1 else oldAyatIdx
                                    pagerState.scrollToPage(targetPage)
                                }
                            }, trailing = {
                                Box(modifier = Modifier.height(28.dp), contentAlignment = Alignment.Center) {
                                    Switch(
                                        checked = isContinuousSwipe,
                                        onCheckedChange = {
                                            val oldAyatIdx = currentAyatIndex
                                            isContinuousSwipe = it
                                            settingsManager.isContinuousSwipe = it
                                            scope.launch {
                                                val newHasPrev = it && currentSurahIndex > 0
                                                val targetPage = if (newHasPrev) oldAyatIdx + 1 else oldAyatIdx
                                                pagerState.scrollToPage(targetPage)
                                            }
                                        },
                                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = currentTheme.primary),
                                        modifier = Modifier.scale(0.8f)
                                    )
                                }
                            })
                        }
                        item {
                            MenuRow(icon = Icons.Default.CheckCircle, title = "Save Reading Position", theme = currentTheme, onClick = {
                                isRememberLastRead = !isRememberLastRead
                                settingsManager.isRememberLastRead = isRememberLastRead
                                if (isRememberLastRead && surahLines.isNotEmpty()) {
                                    settingsManager.lastReadSurah = selectedSurahId
                                    settingsManager.lastReadAyat = surahLines.getOrNull(currentAyatIndex)?.multiAyats?.split("-")?.firstOrNull()?.trim()?.toIntOrNull() ?: 1
                                }
                            }, trailing = {
                                Box(modifier = Modifier.height(28.dp), contentAlignment = Alignment.Center) {
                                    Switch(
                                        checked = isRememberLastRead,
                                        onCheckedChange = {
                                            isRememberLastRead = it
                                            settingsManager.isRememberLastRead = it
                                            if (it && surahLines.isNotEmpty()) {
                                                settingsManager.lastReadSurah = selectedSurahId
                                                settingsManager.lastReadAyat = surahLines.getOrNull(currentAyatIndex)?.multiAyats?.split("-")?.firstOrNull()?.trim()?.toIntOrNull() ?: 1
                                            }
                                        },
                                        colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = currentTheme.primary),
                                        modifier = Modifier.scale(0.8f)
                                    )
                                }
                            })
                        }
                        item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                        item { Text("Translator's Info", modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp), fontSize = 13.sp, color = Color.Gray, fontWeight = FontWeight.Bold) }
                        item { MenuRow(icon = Icons.Default.List, title = "Preface", theme = currentTheme, onClick = { openInfo("Preface", "file:///android_asset/preface.html") }) }
                        item { MenuRow(icon = Icons.Default.List, title = "Introduction", theme = currentTheme, onClick = { openInfo("Introduction", "file:///android_asset/introduction.html") }) }
                        item { MenuRow(icon = Icons.Default.Person, title = "Biography", theme = currentTheme, onClick = { openInfo("Biography", "file:///android_asset/biography.html") }) }
                        item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                        item { MenuRow(icon = Icons.Default.Build, title = "Developer", theme = currentTheme, onClick = { openInfo("Developer", "file:///android_asset/developer.html") }) }
                        item { MenuRow(icon = Icons.Default.Info, title = "About App", theme = currentTheme, onClick = { openInfo("About App", "file:///android_asset/about_app.html") }) }
                        item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }

                        // 🚀 NEW: Update Available Button
                        if (updateApkUrl != null) {
                            item {
                                MenuRow(
                                    icon = Icons.Default.Info,
                                    title = "Update Available",
                                    subtitle = "Tap to download new version",
                                    theme = AppTheme.PINK,
                                    onClick = {
                                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(updateApkUrl))
                                        context.startActivity(intent)
                                    }
                                )
                            }
                            item { HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp)) }
                        }

                        item {
                            val activity = (context as? android.app.Activity)
                            MenuRow(icon = Icons.Default.Close, title = "Exit App", theme = currentTheme, onClick = { activity?.finish() })
                        }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    ) {
        Scaffold(
            containerColor = currentTheme.bg,
            topBar = {
                Surface(shadowElevation = 4.dp, color = Color.White) {
                    val currentInfo = surahInfoMap[selectedSurahId]
                    BlueprintTopBar(
                        theme = currentTheme,
                        surahProg = "$selectedSurahId/114",
                        ayatProg = "$topMultiString / ${currentInfo?.totalAyats ?: "?"}",
                        englishTitle = currentInfo?.englishName ?: "Loading...",
                        myanmarTitle = menuItems.find { it.id == selectedSurahId }?.nameMM ?: "Surah $selectedSurahId",
                        isSurahPlaying = isSurahPlaying,
                        isPrevSurahEnabled = currentSurahIndex > 0,
                        isNextSurahEnabled = currentSurahIndex < menuItems.size - 1,
                        isPrevAyatEnabled = currentAyatIndex > 0 || (isContinuousSwipe && currentSurahIndex > 0),
                        isNextAyatEnabled = currentAyatIndex < surahLines.size - 1 || (isContinuousSwipe && currentSurahIndex < menuItems.size - 1),
                        jumpHistoryCount = jumpHistory.size,
                        isAudioAvailable = isWholeSurahAudioAvailable,
                        isAutoTracking = isAutoTracking,
                        onOpenMenu = { scope.launch { drawerState.open() } },
                        onSurahClick = { isAutoTracking = false; showSurahDialog = true },
                        onAyatClick = { isAutoTracking = false; showAyatKeypad = true },
                        onHistoryClick = {
                            isAutoTracking = false
                            if (jumpHistory.size <= 2) {
                                val jump = jumpHistory.first()
                                jumpHistory = emptyList()
                                isHistoryActive = false
                                executeJump(jump.surahId, jump.ayatId, jump.scrollIndex, jump.scrollOffset)
                            } else {
                                showHistoryDialog = true
                            }
                        },
                        onNextSurah = {
                            isAutoTracking = false
                            if (currentSurahIndex < menuItems.size - 1) {
                                selectedSurahId = menuItems[currentSurahIndex + 1].id
                                pendingJumpToVerse = -1
                            }
                        },
                        onPrevSurah = {
                            isAutoTracking = false
                            if (currentSurahIndex > 0) {
                                selectedSurahId = menuItems[currentSurahIndex - 1].id
                                pendingJumpToVerse = -1
                            }
                        },
                        onNextAyat = {
                            isAutoTracking = false
                            scope.launch {
                                val lastActualPage = if (hasPrevSurahPage) surahLines.size else surahLines.size - 1
                                if (pagerState.currentPage < lastActualPage) {
                                    pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                } else if (isContinuousSwipe && currentSurahIndex < menuItems.size - 1) {
                                    pendingJumpToVerse = 8888
                                    selectedSurahId = menuItems[currentSurahIndex + 1].id
                                }
                            }
                        },
                        onPrevAyat = {
                            isAutoTracking = false
                            scope.launch {
                                val firstActualPage = if (hasPrevSurahPage) 1 else 0
                                if (pagerState.currentPage > firstActualPage) {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                } else if (isContinuousSwipe && currentSurahIndex > 0) {
                                    pendingJumpToVerse = 9999
                                    selectedSurahId = menuItems[currentSurahIndex - 1].id
                                }
                            }
                        },
                        onPlaySurah = toggleSurahAudio,
                        onToggleAutoTrack = {
                            isAutoTracking = !isAutoTracking
                            if (isAutoTracking) {
                                Toast.makeText(context, "Auto-Focus ON", Toast.LENGTH_SHORT).show()
                                val targetPage = surahAudioTrackToPageMap[currentSurahTrackIndex]
                                if (targetPage != null && pagerState.currentPage != targetPage) {
                                    scope.launch { pagerState.animateScrollToPage(targetPage) }
                                }
                            } else {
                                Toast.makeText(context, "Auto-Focus OFF", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
            }
        ) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                    if (surahLines.isEmpty()) return@HorizontalPager

                    val actualAyatIndex = if (hasPrevSurahPage) page - 1 else page

                    if (actualAyatIndex < 0 || actualAyatIndex >= surahLines.size) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = currentTheme.primary)
                        }
                    } else {
                        val listState = rememberLazyListState()
                        val isCurrentPage = pagerState.currentPage == page

                        if (isCurrentPage) {
                            LaunchedEffect(listState.firstVisibleItemIndex, listState.firstVisibleItemScrollOffset) {
                                currentScrollIndex = listState.firstVisibleItemIndex
                                currentScrollOffset = listState.firstVisibleItemScrollOffset
                            }
                        }

                        LaunchedEffect(isCurrentPage, pendingScrollIndex, surahLines) {
                            if (isCurrentPage && pendingScrollIndex != -1 && surahLines.isNotEmpty()) {
                                delay(150)
                                listState.scrollToItem(pendingScrollIndex, pendingScrollOffset)
                                pendingScrollIndex = -1
                                pendingScrollOffset = 0
                            }
                        }

                        val pageAyat = surahLines[actualAyatIndex]
                        val pageMultiString = pageAyat.multiAyats

                        // 🚀 SPLITTING THE TRANSLATION TEXT
                        val rawTranslationCell = pageAyat.translation
                        val translationParts = rawTranslationCell.split("@")
                        val myanmarTextMain = translationParts[0].replace("#", "\n")
                        val myanmarTextNote = if (translationParts.size > 1) translationParts[1].replace("#", "\n") else ""

                        val foundNotes = "(?<=\\s)[0-9]+[a-zA-Z]?(?=[\\s။,]|\$)".toRegex().findAll(myanmarTextMain).map { it.value }.toList()
                        val notesTextRaw = explanationNotes.filter { foundNotes.contains(it.noteId) }.joinToString("\n\n") { "[${it.noteId}] ${it.noteText}" }.replace("#", "\n")
                        val targetIds = parseAyatIds(pageMultiString)
                        val arabicTextRaw = arabicAyahs.filter { targetIds.contains(it.ayatNumber) }.joinToString(" ") { ayah ->
                            val arabicNum = ayah.ayatNumber.toString().map { (it.code + 1584).toChar() }.joinToString("")
                            "${ayah.arabicText} \u06DD$arabicNum"
                        }
                        val isThisAyatAudioAvailable = ayatAudioAvailability[actualAyatIndex] ?: false

                        val playSurahFromHere: () -> Unit = {
                            isAutoTracking = true
                            ayatPlayer.stop()
                            loadedAyatIndex = -1

                            val folderId = selectedSurahId.toString().padStart(3, '0')
                            var missingAudio = false
                            val tempMap = mutableMapOf<Int, Int>()
                            var mediaIdx = 0

                            surahPlayer.stop()
                            surahPlayer.clearMediaItems()

                            if (selectedSurahId != 1 && selectedSurahId != 9) {
                                val bismillahFile = File(context.filesDir, "audio/Quran_32kbps/001/001000.mp3")
                                val bismillahFileAlt = File(context.filesDir, "audio/Quran_32kbps/001/000000.mp3")
                                val fileToUse = if (bismillahFile.exists() && bismillahFile.length() > 0) bismillahFile else if (bismillahFileAlt.exists() && bismillahFileAlt.length() > 0) bismillahFileAlt else null
                                if (fileToUse != null) {
                                    surahPlayer.addMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(fileToUse).toString()))
                                    tempMap[mediaIdx] = if (hasPrevSurahPage) 1 else 0
                                    mediaIdx++
                                } else { missingAudio = true }
                            }

                            surahLines.forEachIndexed { index, line ->
                                val pageIdx = if (hasPrevSurahPage) index + 1 else index
                                val ids = parseAyatIds(line.multiAyats)
                                ids.forEach { id ->
                                    val ayatId = id.toString().padStart(3, '0')
                                    val localFile = File(context.filesDir, "audio/Quran_32kbps/$folderId/$folderId$ayatId.mp3")
                                    if (localFile.exists() && localFile.length() > 0) {
                                        surahPlayer.addMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(localFile).toString()))
                                        tempMap[mediaIdx] = pageIdx
                                        mediaIdx++
                                    } else { missingAudio = true }
                                }
                            }

                            if (!missingAudio) {
                                surahAudioTrackToPageMap = tempMap
                                surahPlayer.prepare()
                                val targetMediaIndex = tempMap.entries.firstOrNull { it.value == page }?.key ?: 0
                                surahPlayer.seekTo(targetMediaIndex, 0)
                                currentSurahTrackIndex = targetMediaIndex
                                surahPlayer.play()
                            }
                        }

                        LazyColumn(state = listState, modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(top = 6.dp, bottom = 24.dp)) {
                            item {
                                val isThisPlaying = isAyatPlaying && loadedAyatIndex == page
                                val arabicNamePart = surahInfoMap[selectedSurahId]?.arabicName ?: ""
                                val ayatNumbersPart = " \u202A [$selectedSurahId:$pageMultiString]\u202C"
                                val styledArabicTitle = buildAnnotatedString {
                                    withStyle(style = SpanStyle(fontSize = 22.sp)) { append(arabicNamePart) }
                                    withStyle(style = SpanStyle(fontSize = 14.sp, fontWeight = FontWeight.Bold)) { append(ayatNumbersPart) }
                                }
                                BlueprintCard(
                                    title = styledArabicTitle,
                                    theme = currentTheme,
                                    isPlaying = isThisPlaying,
                                    isAudioAvailable = isThisAyatAudioAvailable,
                                    onPlayPause = toggleAudio,
                                    onPlayForward = playSurahFromHere,
                                    isPlayForwardEnabled = loadedAyatIndex == page,
                                    onCopy = { copyToClip(arabicTextRaw) },
                                    onZoomIn = { if (arabicFontScale < 1.5f) arabicFontScale += 0.1f },
                                    onZoomOut = { if (arabicFontScale > 0.8f) arabicFontScale -= 0.1f }
                                ) {
                                    Text(arabicTextRaw, fontSize = (28 * arabicFontScale).sp, textAlign = TextAlign.Right, modifier = Modifier.fillMaxWidth(), color = Color(0xFF222222))
                                }
                            }

                            item {
                                BlueprintCard(
                                    title = "Myanmar Translation",
                                    theme = currentTheme,
                                    isPlaying = false,
                                    isAudioAvailable = true,
                                    onPlayPause = null,
                                    onPlayForward = null,
                                    isPlayForwardEnabled = false,
                                    onCopy = {
                                        val copyText = if (myanmarTextNote.isNotEmpty()) "$myanmarTextMain\n\nTranslation Note:\n$myanmarTextNote" else myanmarTextMain
                                        copyToClip("QuranMM translation [$selectedSurahId:$pageMultiString]\n\n$copyText\n\nကုရ်အာန်ဘာသာပြန် -\nဆရာဦးကျော်ဝင်း")
                                    },
                                    onZoomIn = { if (myanmarFontScale < 1.5f) myanmarFontScale += 0.1f },
                                    onZoomOut = { if (myanmarFontScale > 0.8f) myanmarFontScale -= 0.1f }
                                ) {
                                    Column {
                                        JumpableText(myanmarTextMain, myanmarFontScale, currentTheme, { sId, aId -> handleJumpClick(sId, aId) })

                                        if (myanmarTextNote.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(16.dp))
                                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                                                Text(
                                                    text = "Translation Note",
                                                    fontSize = (12 * myanmarFontScale).sp,
                                                    color = Color.Gray,
                                                    fontWeight = FontWeight.Medium
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                HorizontalDivider(color = Color.LightGray.copy(alpha = 0.5f))
                                            }
                                            Spacer(modifier = Modifier.height(8.dp))
                                            JumpableText(myanmarTextNote, myanmarFontScale, currentTheme, { sId, aId -> handleJumpClick(sId, aId) })
                                        }
                                    }
                                }
                            }

                            item {
                                BlueprintCard(
                                    title = "Explanation Notes (Tafsir)",
                                    theme = currentTheme,
                                    isPlaying = false,
                                    isAudioAvailable = true,
                                    onPlayPause = null,
                                    onPlayForward = null,
                                    isPlayForwardEnabled = false,
                                    onCopy = { copyToClip("QuranMM Tafsir [$selectedSurahId:$pageMultiString]\n\n$notesTextRaw\n\nကုရ်အာန်ဘာသာပြန် -\nဆရာဦးကျော်ဝင်း") },
                                    onZoomIn = { if (noteFontScale < 1.5f) noteFontScale += 0.1f },
                                    onZoomOut = { if (noteFontScale > 0.8f) noteFontScale -= 0.1f }
                                ) {
                                    if (notesTextRaw.isEmpty()) {
                                        Text(text = "No Explanation Notes (Tafsir) for this Ayat.\nဤ Ayat အတွက် အကျယ်ဖွင့်ရှင်းလင်းချက် မရှိပါ။", fontSize = (15 * noteFontScale).sp, color = Color.Gray, lineHeight = (22 * noteFontScale).sp)
                                    } else {
                                        JumpableText(notesTextRaw, noteFontScale, currentTheme, { sId, aId -> handleJumpClick(sId, aId) })
                                    }
                                }
                            }
                        }
                    }
                }
                if (isLoadingSurah) {
                    Box(modifier = Modifier.fillMaxSize().background(currentTheme.bg), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = currentTheme.primary)
                            Spacer(Modifier.height(16.dp))
                            Text("Loading...", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = currentTheme.primary)
                        }
                    }
                }
            }
        }
    }
}

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
        style = androidx.compose.ui.text.TextStyle(fontSize = (18 * fontScale).sp, color = Color(0xFF333333), lineHeight = (28 * fontScale).sp),
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

@Composable
fun MenuRow(icon: ImageVector, title: String, subtitle: String? = null, theme: AppTheme, onClick: () -> Unit, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 20.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = title, tint = theme.primary, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = theme.primary)
            if (subtitle != null) {
                Text(subtitle, fontSize = 12.sp, color = Color.Gray)
            }
        }
        if (trailing != null) { trailing() }
    }
}

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
            Text(myanmarTitle, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = theme.primary, textAlign = TextAlign.Right, maxLines = 2, lineHeight = 20.sp, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun BlueprintCard(theme: AppTheme, title: Any, titleFontSize: androidx.compose.ui.unit.TextUnit = 13.sp, isPlaying: Boolean, isAudioAvailable: Boolean, onPlayPause: (() -> Unit)?, onPlayForward: (() -> Unit)? = null, isPlayForwardEnabled: Boolean = false, onCopy: () -> Unit, onZoomIn: () -> Unit, onZoomOut: () -> Unit, content: @Composable () -> Unit) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), colors = CardDefaults.cardColors(containerColor = theme.card), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
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
            Box(Modifier.fillMaxWidth().background(Color.White).padding(16.dp)) {
                content()
            }
        }
    }
}