package com.roundsloyalty.app.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PurchaseClaim(
    val id: String,
    @SerialName("customer_id") val customerId: String,
    @SerialName("vendor_id") val vendorId: String,
    @SerialName("receipt_image_url") val receiptImageUrl: String? = null,
    @SerialName("purchase_amount") val purchaseAmount: Double? = null,
    @SerialName("purchase_date") val purchaseDate: String? = null,
    @SerialName("customer_note") val customerNote: String? = null,
    @SerialName("vendor_note") val vendorNote: String? = null,
    val status: String = "pending_review",
    @SerialName("created_at") val createdAt: String? = null,
)
