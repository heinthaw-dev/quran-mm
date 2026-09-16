package com.quranmm.app

import android.app.Activity
import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// ⚠️ data class UpdateInfo ကို ဒီဖိုင်ထဲမှာ ထပ်မရေးပါနဲ့ (QuranModels.kt ထဲမှာ ရှိပြီးသားမို့လို့ပါ)

fun checkForUpdate(context: Context, onUpdateAvailable: (UpdateInfo) -> Unit) {
    val jsonUrl = "http://38.247.64.94/uploads/APK/update.json"

    Thread {
        try {
            val url = URL(jsonUrl)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 5000
            val data = connection.inputStream.bufferedReader().readText()

            val json = JSONObject(data)
            val serverVersionCode = json.getInt("version_code")
            val serverVersionName = json.getString("version_name")
            val apkUrl = json.getString("apk_url")

            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val currentVersionCode = if (android.os.Build.VERSION.SDK_INT >= 28) {
                packageInfo.longVersionCode.toInt()
            } else {
                packageInfo.versionCode
            }

            if (serverVersionCode > currentVersionCode) {
                (context as? Activity)?.runOnUiThread {
                    // ဒီနေရာမှာ QuranModels.kt ထဲက UpdateInfo ကို အလိုအလျောက် သုံးသွားပါလိမ့်မယ်
                    onUpdateAvailable(UpdateInfo(serverVersionCode, serverVersionName, apkUrl))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }.start()
}