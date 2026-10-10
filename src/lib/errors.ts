// The API answers with short machine codes ("too_many_requests"). Showing
// those to a seller in a form was a UX bug found in review — this maps each
// code to a sentence a person can act on.
const MESSAGES: Record<string, { ar: string; en: string }> = {
  login_required: { ar: "سجّل دخولك الأول عشان تتواصل", en: "Log in first to contact the seller" },
  onboarding_required: { ar: "كمّل بياناتك الأساسية الأول", en: "Please complete your basic info first" },
  select_at_least_one_interest: { ar: "اختار قسم واحد على الأقل", en: "Pick at least one category" },
  too_many_interests: { ar: "اخترت أقسام كتير (الحد 15)", en: "Too many categories (max 15)" },
  invalid_interest_category: { ar: "قسم غير صالح", en: "Invalid category" },
  invalid_role: { ar: "نوع الحساب غير صالح", en: "Invalid account type" },
  invalid_name: { ar: "الاسم مطلوب", en: "Name is required" },
  invalid_whatsapp: { ar: "رقم الواتساب مش صحيح", en: "WhatsApp number isn't valid" },
  location_required: { ar: "اختار العنوان", en: "Choose your address" },
  location_not_found: { ar: "العنوان غير موجود", en: "Location not found" },
  cannot_contact_own_listing: { ar: "ده إعلانك انت", en: "This is your own listing" },
  otp_delivery_not_configured: { ar: "خدمة إرسال الكود مش متاحة دلوقتي", en: "Code delivery isn't available right now" },
  invalid_birth_date: { ar: "تاريخ الميلاد غير صحيح (لازم يكون سنك 18 سنة أو أكتر)", en: "Invalid birth date (you must be 18 or older)" },
  invalid_gender: { ar: "اختار النوع", en: "Choose your gender" },
  invalid_referral_source: { ar: "اختيار غير صالح", en: "Invalid choice" },
  unauthorized: { ar: "لازم تسجل دخول الأول", en: "Please log in first" },
  forbidden: { ar: "مش مسموحلك بالعملية دي", en: "You're not allowed to do that" },
  too_many_requests: { ar: "محاولات كتير — استنى شوية وحاول تاني", en: "Too many attempts — wait a bit and try again" },
  too_many_listings_today: { ar: "وصلت للحد الأقصى من الإعلانات في الساعة، حاول بعدين", en: "Listing limit reached for this hour, try again later" },
  too_many_uploads: { ar: "رفعت صور كتير، استنى شوية", en: "Too many uploads, wait a bit" },
  invalid_phone: { ar: "رقم الموبايل مش صحيح", en: "That phone number isn't valid" },
  sms_not_configured: { ar: "خدمة الرسائل مش متاحة دلوقتي", en: "SMS service isn't available right now" },
  wrong_code: { ar: "الكود غلط", en: "Wrong code" },
  expired_or_missing: { ar: "الكود انتهى أو مش موجود — اطلب كود جديد", en: "Code expired or not found — request a new one" },
  too_many_attempts: { ar: "محاولات غلط كتير — اطلب كود جديد", en: "Too many wrong attempts — request a new code" },
  duplicate_listing: { ar: "الإعلان ده شبه إعلان نشرته قبل كده", en: "This looks like a listing you already posted" },
  invalid_title: { ar: "عنوان الإعلان مش صالح", en: "The title isn't valid" },
  invalid_description: { ar: "الوصف مش صالح", en: "The description isn't valid" },
  invalid_price: { ar: "السعر مش صالح", en: "The price isn't valid" },
  invalid_images: { ar: "الصور مش صالحة — ارفع صورة واحدة على الأقل (حتى 8)", en: "Photos aren't valid — upload 1 to 8 photos" },
  file_is_not_a_supported_image: { ar: "الملف ده مش صورة مدعومة (JPG / PNG / WEBP)", en: "That file isn't a supported image (JPG / PNG / WEBP)" },
  file_too_large_or_empty: { ar: "الصورة كبيرة جدًا (الحد 4 ميجا)", en: "Image is too large (4MB max)" },
  category_must_be_most_specific: { ar: "اختار القسم لحد آخر مستوى", en: "Choose the category down to the most specific level" },
  category_not_available: { ar: "القسم ده مش متاح", en: "That category isn't available" },
  location_must_be_most_specific: { ar: "اختار الموقع لحد آخر مستوى", en: "Choose the location down to the most specific level" },
  location_not_available: { ar: "الموقع ده مش متاح", en: "That location isn't available" },
  missing_required_attribute: { ar: "فيه حقول إجبارية لسه ماتملتش", en: "Some required fields are still empty" },
  invalid_option: { ar: "اختيار غير صالح في أحد الحقول", en: "A field has an invalid choice" },
  listing_not_available: { ar: "الإعلان ده مش متاح دلوقتي", en: "This listing isn't available right now" },
  cannot_buy_own_listing: { ar: "مينفعش تشتري إعلانك", en: "You can't buy your own listing" },
  not_found: { ar: "مش موجود", en: "Not found" },
  has_children: { ar: "القسم ده جواه أقسام فرعية — امسحها الأول أو عطّله", en: "It contains sub-items — remove them first or deactivate it" },
  has_products: { ar: "فيه إعلانات في القسم ده — عطّله بدل الحذف", en: "It has listings — deactivate it instead of deleting" },
  in_use: { ar: "مستخدم في إعلانات — عطّله بدل الحذف", en: "It's used by listings — deactivate it instead of deleting" },
  type_locked_in_use: { ar: "مينفعش تغيّر نوع الحقل لأن إعلانات بتستخدمه", en: "Can't change the field type while listings use it" },
  max_depth_reached: { ar: "وصلت لأقصى عمق للأقسام", en: "Maximum depth reached" },
  cannot_move_under_itself: { ar: "مينفعش تنقل القسم جوه نفسه", en: "You can't move an item under itself" },
};

export function errorMessage(code: unknown, isAr: boolean): string {
  const entry = typeof code === "string" ? MESSAGES[code] : undefined;
  if (entry) return isAr ? entry.ar : entry.en;
  return isAr ? "حصل خطأ، حاول تاني" : "Something went wrong, please try again";
}
