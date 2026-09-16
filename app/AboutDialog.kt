package com.quranmm.app

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ၁။ Version ကို build.gradle ထဲကနေ လှမ်းယူတဲ့ function
fun getAppVersion(context: Context): String {
    return try {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        packageInfo.versionName ?: "Unknown"
    } catch (e: Exception) {
        "Unknown"
    }
}

// ၂။ Dialog UI Component
@Composable
fun AboutDialog(onDismiss: () -> Unit, theme: AppTheme) {
    val context = LocalContext.current
    val versionName = getAppVersion(context)
    val currentYear = 2026 // သို့မဟုတ် Calendar မှတစ်ဆင့် ယူနိုင်သည်

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = theme.primary)
            }
        },
        title = {
            Text(text = "About App", fontWeight = FontWeight.Bold, color = theme.primary)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Version: $versionName", fontWeight = FontWeight.Medium)
                Divider(color = theme.primary.copy(alpha = 0.2f))

                Text(text = "App & Software Design:", fontWeight = FontWeight.Bold)
                Text(text = "Copyright © $currentYear noon Software Development Team. All rights reserved.")

                Spacer(modifier = Modifier.height(8.dp))

                Text(text = "Myanmar Translation & Tafsir:", fontWeight = FontWeight.Bold)
                Text(text = "Copyright © $currentYear U Kyaw Win. All rights reserved.")

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "No part of this software may be reproduced, distributed, or transmitted in any form without the prior written permission of the respective copyright holders.",
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    color = Color.Gray
                )
            }
        },
        containerColor = Color.White,
        shape = RoundedCornerShape(16.dp)
    )
}
