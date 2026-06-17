package com.roundsloyalty.app

import android.app.Application
import com.roundsloyalty.app.data.SupabaseClient

class RoundsLoyaltyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        SupabaseClient.init(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY)
    }
}
