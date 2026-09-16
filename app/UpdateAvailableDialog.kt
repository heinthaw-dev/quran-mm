package com.quranmm.app

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun UpdateAvailableDialog(
    newVersion: String,
    onUpdate: () -> Unit,
    onDismiss: () -> Unit,
    theme: AppTheme
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Update Available!", fontWeight = FontWeight.Bold, color = theme.primary) },
        text = { Text("ဗားရှင်းအသစ် ($newVersion) ထွက်ရှိနေပါပြီ။ Update ပြုလုပ်လိုပါသလား?") },
        confirmButton = {
            Button(onClick = onUpdate, colors = ButtonDefaults.buttonColors(containerColor = theme.primary)) {
                Text("Update Now", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Later", color = Color.Gray)
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}