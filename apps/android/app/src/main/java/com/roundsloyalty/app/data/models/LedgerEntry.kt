package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LedgerEntry(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("vendor_id") val vendorId: String,
    @SerialName("event_type") val eventType: String,
    @SerialName("points_delta") val pointsDelta: Int = 0,
    @SerialName("stamps_delta") val stampsDelta: Int = 0,
    val source: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)
