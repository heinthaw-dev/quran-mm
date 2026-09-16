package com.quranmm.app

import java.io.File

fun main() {
    // ⚠️ IMPORTANT: Change this to the exact folder path on your Windows computer where your CSVs are!
    // Example: "C:/Users/Ohn/Desktop/QuranCSVs"
    val inputFolder = File("D:/Dev/Android/QuranMM/app/src/main/assets")

    val outputFolder = File(inputFolder, "fixed_csvs")
    if (!outputFolder.exists()) {
        outputFolder.mkdir()
    }

    // Myanmar to English Number Mapping
    val mmToEnMap = mapOf('၀' to '0', '၁' to '1', '၂' to '2', '၃' to '3', '၄' to '4', '၅' to '5', '၆' to '6', '၇' to '7', '၈' to '8', '၉' to '9')
    fun mmToEn(mmStr: String): String {
        return mmStr.map { mmToEnMap[it] ?: it }.joinToString("")
    }

    // Regex 1: Finds where the English footnote is defined in your text (e.g., " 1143 ")
    val enNoteRegex = "(?<=\\s)([0-9]+[a-zA-Z]?)(?=[\\s။,]|\$)".toRegex()

    // Regex 2: Finds the Myanmar footnote references!
    // Captures optional "၆း၁၃၀၊ ", optional "အောက်ခြေ ", and the number "(၆၂၉)"
    val mmNoteRegex = "([\u1040-\u10490-9]+\\s*[း:]\\s*[\u1040-\u10490-9]+\\s*[၊,]\\s*)?(အောက်ခြေ\\s*)?\\(([\u1040-\u1049]+)\\)".toRegex()

    val footnoteMap = mutableMapOf<String, String>()

    println("Phase 1: Scanning all CSVs to build the Footnote Map...")

    // =========================================
    // PHASE 1: Build the Footnote Map
    // =========================================
    for (surahId in 1..114) {
        val fileName = String.format("%03d.csv", surahId)
        val file = File(inputFolder, fileName)
        if (!file.exists()) continue

        val lines = file.readLines()
        if (lines.isEmpty()) continue

        for (i in 1 until lines.size) {
            val row = parseCsvLineSimple(lines[i])
            if (row.size < 2) continue

            val ayatIdStr = row[0].replace("\uFEFF", "").trim()
            val multiAyats = if (row.size >= 3 && row[2].isNotBlank()) row[2].replace("\uFEFF", "").trim() else ayatIdStr
            val firstAyat = multiAyats.split("-")[0].trim()

            // Look at the main translation text before the '@' symbol
            val textMain = row[1].split("@")[0]

            enNoteRegex.findAll(textMain).forEach { matchResult ->
                footnoteMap[matchResult.value] = "[$surahId:$firstAyat]"
            }
        }
    }

    println("-> Found ${footnoteMap.size} footnote definitions in your text!")
    println("\nPhase 2: Fixing the orphan references...")

    // =========================================
    // PHASE 2: Fix the Orphan References
    // =========================================
    for (surahId in 1..114) {
        val fileName = String.format("%03d.csv", surahId)
        val file = File(inputFolder, fileName)
        if (!file.exists()) continue

        val lines = file.readLines()
        val newLines = mutableListOf<String>()
        newLines.add(lines[0]) // Add Header back

        var changesMade = 0

        for (i in 1 until lines.size) {
            val row = parseCsvLineSimple(lines[i])
            if (row.size < 2) {
                newLines.add(lines[i])
                continue
            }

            val originalText = row[1]
            var newText = originalText

            // We process the matches backwards so that changing text length doesn't mess up earlier positions!
            mmNoteRegex.findAll(originalText).toList().reversed().forEach { match ->
                val oldPrefix = match.groups[1]?.value ?: ""
                val aoukChay = match.groups[2]?.value ?: ""
                val mmNum = match.groups[3]?.value ?: ""
                val enNum = mmToEn(mmNum)

                if (footnoteMap.containsKey(enNum)) {
                    val targetJump = footnoteMap[enNum]!!
                    val startIndex = match.range.first
                    val textBefore = originalText.substring(maxOf(0, startIndex - 15), startIndex)

                    // Only inject if the target jump bracket isn't already right there
                    if (!textBefore.contains(targetJump)) {
                        val replacement = if (oldPrefix.isNotEmpty()) {
                            // Converts "၆း၁၃၀၊ အောက်ခြေ (၆၂၉)" -> "[6:130]၊ အောက်ခြေ (၆၂၉)"
                            "$targetJump၊ $aoukChay($mmNum)"
                        } else {
                            // Converts "(၁၁၄၃)" -> "[18:50] (၁၁၄၃)"
                            "$targetJump $aoukChay($mmNum)"
                        }
                        newText = newText.replaceRange(match.range, replacement)
                        changesMade++
                    }
                }
            }

            // Put the CSV row back together safely
            val newRow = row.toMutableList()
            newRow[1] = newText
            newLines.add(newRow.joinToString(",") { "\"${it.replace("\"", "\"\"")}\"" })
        }

        // Save into the new 'fixed_csvs' folder so your originals are safe
        val outputFile = File(outputFolder, fileName)
        outputFile.writeText(newLines.joinToString("\n"))

        if (changesMade > 0) {
            println("-> Fixed $changesMade missing jumps in Surah $surahId")
        }
    }
    println("\nDone! All fixed CSVs are waiting inside the new 'fixed_csvs' folder.")
}

// Simple internal parser for this script
fun parseCsvLineSimple(line: String): List<String> {
    val result = mutableListOf<String>()
    val current = StringBuilder()
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