package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RewardInstance(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("vendor_id") val vendorId: String,
    val status: String, // available, redeemed, expired
    @SerialName("reward_name") val rewardName: String,
    @SerialName("reward_description") val rewardDescription: String? = null,
    @SerialName("earned_at") val earnedAt: String? = null,
    @SerialName("redeemed_at") val redeemedAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
)
