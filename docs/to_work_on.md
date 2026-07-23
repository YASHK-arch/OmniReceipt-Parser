1. ## Currency Tagging Fallback Logic

When the currency symbol is not explicitly mentioned on the receipt, the LLM should first attempt to infer the most likely currency using contextual information, such as:

* Merchant address
* Country or region
* Store location
* Phone number country code
* Other geographical identifiers present on the receipt

This contextual inference is a good approach and should be used whenever there is sufficient evidence to make a reliable prediction.

However, there may be cases where the currency cannot be determined with reasonable confidence because the receipt lacks any identifiable geographical or contextual information.

In such situations, the system **should not default to the US Dollar ($) symbol**, as this could mislead users and introduce incorrect financial data.

Instead, the currency field should display a neutral placeholder, such as the **🪙 coin emoji**, indicating that the currency is currently unknown and could not be confidently identified.

This approach clearly communicates uncertainty to the user while avoiding incorrect assumptions or misleading defaults.

-----------------------------------------------------------------------------------------------------------------


-----------------------------------------------------------------------------------------------------------------
4. # Analysis Logs, Confidence Score, Edge Case Handling, and Re-click Prompting

I have already identified most of the possible edge cases, but there will always be situations that are extremely rare or practically invisible to the system.

One such example is the **reciept**, where the image quality makes the content almost impossible to interpret. Another example is an **AI-generated receipt** containing distorted or unrealistic text. However, distortion is not limited to AI-generated images. A genuine receipt can also become partially unreadable because of camera shake, motion blur, poor focus, low lighting, or image compression. In these situations, only certain sections of the receipt may remain readable while other portions are distorted or missing.

## Expected LLM Behavior

The LLM should not simply reject every imperfect image.

If a receipt is **partially readable**, the model should:

* Extract and display all information that is clearly visible.
* Ignore only the unreadable or highly uncertain sections.
* Clearly indicate which fields could not be extracted due to image quality.
* Avoid hallucinating or guessing missing information.

If the receipt is **completely unreadable**, the model should avoid producing any extracted data and instead request that the user upload a clearer image.

---

# Analysis Log System

To make the extraction process transparent, an **Analysis Log** feature should be added.

A small **Analysis Log icon** should be placed above the Netlify button (or in the designated toolbar). Every time GPT processes a receipt, it should generate an analysis report that is stored in this log.

Each log entry should contain:

* Timestamp of the analysis
* Image processing summary
* OCR/LLM extraction summary
* Which regions were successfully analyzed
* Which regions were unreadable
* Extraction confidence
* Image clarity score
* Final extraction decision
* Any warnings generated during processing

This allows users to understand exactly how the system reached its conclusions instead of treating the model as a black box.

---

# Image Clarity / Confidence Score

Along with the analysis report, the system should generate an **Image Clarity Score** (0–100%).

The score represents how confidently the model believes the image can be analyzed.

Example confidence ranges:

### 90–100%

* Excellent image quality.
* Nearly all information extracted successfully.
* No warnings.

### 70–89%

* Good image quality.
* Minor quality issues.
* Most fields extracted successfully.

### 40–69%

* Moderate quality.
* Some portions are cropped, blurred, or distorted.
* Partial extraction possible.
* Missing fields should be highlighted.

### 10–39%

* Poor quality.
* Large portions unreadable.
* Extraction is unreliable.
* User should be advised to retake the image.

### 0–9%

* Extremely poor quality.
* Image is almost completely unreadable.
* No reliable extraction should be attempted.

---

# Edge Case Handling

## Case 1 — Fully Readable Receipt

* Extract all fields.
* Display the complete receipt.
* Confidence score is high.
* No warnings required.

---

## Case 2 — Partially Visible or Cropped Receipt

Some sections are readable while others are missing.

The system should:

* Extract only the visible information.
* Mark unavailable fields as **"Not Visible"** or **"Could Not Be Extracted."**
* Generate an analysis log showing which areas were successfully processed.
* Display a medium confidence score.

A small slide-out notification should appear from the Analysis Log icon with a message similar to:

> **Some portions of your receipt are cropped or unclear. We extracted all visible information, but certain details could not be recovered. For the most accurate results, please upload a clearer image.**

---

## Case 3 — Blurry or Distorted Image

The receipt contains severe motion blur, focus issues, or distorted text.

The system should:

* Attempt extraction only if enough readable text exists.
* Avoid guessing uncertain values.
* Record the quality issues in the analysis log.
* Assign a low confidence score.

The notification should state:

> **This image appears blurry or distorted. Some information may be inaccurate or incomplete. Please retake the photo using better lighting and keep the camera steady.**

---

## Case 4 — Completely Unreadable Image

Examples include:

* Heavy blur
* Completely distorted image
* AI-generated unreadable receipt
* Extremely low resolution
* Missing receipt

The system should:

* Skip data extraction.
* Record the failure reason in the analysis log.
* Assign an extremely low confidence score.

The slide-out notification should display:

> **We couldn't read the receipt because the image quality is too poor. Please upload a clearer photo with the entire receipt visible and in focus.**

---

# UI Behavior

Instead of displaying intrusive full-screen pop-ups, the notifications should originate from the **Analysis Log icon** as a small slide-out panel in the corner of the interface.

This keeps the workflow non-disruptive while still informing users about any issues with their uploaded image.

The notification should include:

* Confidence score
* Image quality status
* Extraction summary
* Missing fields (if any)
* Recommended action (if re-upload is needed)

---

# Benefits

This approach provides:

* Transparent AI decision-making
* Explainable extraction results
* Better handling of edge cases
* Reduced hallucinations
* Improved user trust
* Actionable feedback for users
* A complete history of every analysis performed by the system


