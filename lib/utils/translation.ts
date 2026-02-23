/**
 * Translation utility for automatic product translation
 * Uses MyMemory Translation API (free tier, no API key required)
 */

const TRANSLATION_CACHE_KEY = 'product_translations_v2'
const CACHE_EXPIRY_DAYS = 7

interface TranslationCache {
    [key: string]: {
        translation: string
        timestamp: number
    }
}

/**
 * Detect if text is primarily English or Portuguese
 * Simple heuristic based on common words
 */
export function detectLanguage(text: string): 'en' | 'pt' {
    if (!text || text.trim().length === 0) return 'en'

    const lowerText = text.toLowerCase()

    // Portuguese indicators - common words, articles, and suffixes
    const ptIndicators = [
        'ção', 'ões', 'ão', 'ã', 'õe',
        ' de ', ' do ', ' da ', ' em ', ' para ', ' com ', ' não ', ' são ', ' um ', ' uma ',
        'alto-falante', 'resistencia', 'condensador', 'potenciometro', 'cabo', 'fio', 'conector'
    ]
    const ptCount = ptIndicators.filter(indicator => lowerText.includes(indicator)).length

    // English indicators - common words, articles
    const enIndicators = [
        ' the ', ' and ', ' with ', ' this ', ' that ', ' from ', ' have ', ' been ', ' will ',
        'speaker', 'resistor', 'capacitor', 'potentiometer', 'cable', 'wire', 'connector'
    ]
    const enCount = enIndicators.filter(indicator => lowerText.includes(indicator)).length

    // Special case for uppercase-only or short strings where indicators might miss
    // If it contains characters unique to Portuguese, it's Portuguese
    if (/[áàâãéèêíïóòôõúüç]/.test(lowerText)) {
        return 'pt'
    }

    return ptCount > enCount ? 'pt' : 'en'
}

/**
 * Get cached translation if available and not expired
 */
function getCachedTranslation(text: string, targetLang: 'en' | 'pt'): string | null {
    try {
        const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
        if (!cacheStr) return null

        const cache: TranslationCache = JSON.parse(cacheStr)
        const cacheKey = `${text}_${targetLang}`
        const cached = cache[cacheKey]

        if (!cached) return null

        // Check if cache is expired
        const now = Date.now()
        const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        if (now - cached.timestamp > expiryTime) {
            return null
        }

        return cached.translation
    } catch (error) {
        console.error('Error reading translation cache:', error)
        return null
    }
}

/**
 * Save translation to cache
 */
function setCachedTranslation(text: string, targetLang: 'en' | 'pt', translation: string): void {
    try {
        const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
        const cache: TranslationCache = cacheStr ? JSON.parse(cacheStr) : {}

        const cacheKey = `${text}_${targetLang}`
        cache[cacheKey] = {
            translation,
            timestamp: Date.now()
        }

        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
        console.error('Error saving translation cache:', error)
    }
}

/**
 * Translate text using MyMemory API
 */
async function translateWithAPI(text: string, sourceLang: 'en' | 'pt', targetLang: 'en' | 'pt'): Promise<string> {
    try {
        // Use our API route to avoid CORS issues
        const encodedText = encodeURIComponent(text)
        const url = `/api/translate?q=${encodedText}&langpair=${sourceLang}|${targetLang}`

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Translation API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            return data.responseData.translatedText
        }

        throw new Error('Invalid translation response')
    } catch (error) {
        console.error('Translation API error:', error)
        throw error
    }
}

/**
 * Main translation function with caching and fallback
 * @param text - Text to translate
 * @param targetLang - Target language ('en' or 'pt')
 * @returns Translated text or original text if translation fails
 */
export async function getTranslation(text: string, targetLang: 'en' | 'pt'): Promise<string> {
    // Return original if empty
    if (!text || text.trim().length === 0) {
        return text
    }

    // Detect source language
    const sourceLang = detectLanguage(text)

    // If already in target language, return as-is
    if (sourceLang === targetLang) {
        return text
    }

    // Check cache first
    const cached = getCachedTranslation(text, targetLang)
    if (cached) {
        return cached
    }

    // Translate using API
    try {
        const translation = await translateWithAPI(text, sourceLang, targetLang)
        setCachedTranslation(text, targetLang, translation)
        return translation
    } catch (error) {
        console.error('Translation failed, using original text:', error)
        return text // Fallback to original text
    }
}

/**
 * Clear translation cache (useful for debugging)
 */
export function clearTranslationCache(): void {
    try {
        localStorage.removeItem(TRANSLATION_CACHE_KEY)
    } catch (error) {
        console.error('Error clearing translation cache:', error)
    }
}
