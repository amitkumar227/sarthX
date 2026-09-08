/**
 * SarthX Bhashini AI Client & Natural Language Requirement Parser
 * Connects to MeitY Bhashini Dhruva Pipeline API with seamless browser fallback.
 */

class BhashiniService {
    constructor() {
        this.STORAGE_KEY = 'sarthx_bhashini_config';
        this.DEFAULT_INFERENCE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
        this.loadConfig();

        // Supported Indian languages (ISO 639-1 / Bhashini language codes)
        this.languages = [
            { code: 'en', name: 'English', native: 'English', bhashiniCode: 'en' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी', bhashiniCode: 'hi' },
            { code: 'bn', name: 'Bengali', native: 'বাংলা', bhashiniCode: 'bn' },
            { code: 'te', name: 'Telugu', native: 'తెలుగు', bhashiniCode: 'te' },
            { code: 'mr', name: 'Marathi', native: 'मराठी', bhashiniCode: 'mr' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்', bhashiniCode: 'ta' },
            { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', bhashiniCode: 'gu' },
            { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', bhashiniCode: 'kn' },
            { code: 'ml', name: 'Malayalam', native: 'മലയാളം', bhashiniCode: 'ml' },
            { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', bhashiniCode: 'pa' },
            { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', bhashiniCode: 'or' },
            { code: 'ur', name: 'Urdu', native: 'اردو', bhashiniCode: 'ur' }
        ];

        this.currentLang = 'en';
        this.speechRecognition = null;
        this.isListening = false;
        this.initSpeechRecognition();
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.config = JSON.parse(saved);
            } else {
                this.config = {
                    userID: '',
                    ulcaApiKey: '',
                    pipelineId: '',
                    inferenceUrl: this.DEFAULT_INFERENCE_URL,
                    asrTaskServiceId: '',
                    translationTaskServiceId: '',
                    ttsTaskServiceId: ''
                };
            }
        } catch (e) {
            console.warn('Unable to read Bhashini config from localStorage', e);
            this.config = { inferenceUrl: this.DEFAULT_INFERENCE_URL };
        }
    }

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.error('Failed to save Bhashini config', e);
        }
        return true;
    }

    isConfigured() {
        return Boolean(this.config.userID && this.config.ulcaApiKey);
    }

    initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            this.speechRecognition = new SpeechRec();
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = true;
            this.speechRecognition.maxAlternatives = 1;
        } else {
            console.warn('Web Speech API is not supported in this browser.');
        }
    }

    /**
     * Start speech recognition with automatic regional language mapping
     */
    startVoiceRecognition({ lang = 'hi-IN', onStart, onResult, onError, onEnd }) {
        if (!this.speechRecognition) {
            if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return false;
        }

        if (this.isListening) {
            try { this.speechRecognition.stop(); } catch (e) {}
            this.isListening = false;
        }

        this.speechRecognition.lang = lang;

        this.speechRecognition.onstart = () => {
            this.isListening = true;
            if (onStart) onStart();
        };

        this.speechRecognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (onResult) {
                onResult({
                    finalText: finalTranscript.trim(),
                    interimText: interimTranscript.trim(),
                    isFinal: finalTranscript.length > 0
                });
            }
        };

        this.speechRecognition.onerror = (event) => {
            this.isListening = false;
            if (onError) onError(event.error);
        };

        this.speechRecognition.onend = () => {
            this.isListening = false;
            if (onEnd) onEnd();
        };

        try {
            this.speechRecognition.start();
            return true;
        } catch (err) {
            if (onError) onError(err.message || 'Failed to start microphone');
            return false;
        }
    }

    stopVoiceRecognition() {
        if (this.speechRecognition && this.isListening) {
            try { this.speechRecognition.stop(); } catch (e) {}
            this.isListening = false;
        }
    }

    /**
     * Translate Text using Bhashini Dhruva API or smart dictionary fallback
     */
    async translate({ text, sourceLang = 'en', targetLang = 'hi' }) {
        if (!text || sourceLang === targetLang) return text;

        if (this.isConfigured()) {
            try {
                const response = await fetch(this.config.inferenceUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'userID': this.config.userID,
                        'ulcaApiKey': this.config.ulcaApiKey
                    },
                    body: JSON.stringify({
                        pipelineTasks: [
                            {
                                taskType: 'translation',
                                config: {
                                    language: {
                                        sourceLanguage: sourceLang,
                                        targetLanguage: targetLang
                                    },
                                    serviceId: this.config.translationTaskServiceId || undefined
                                }
                            }
                        ],
                        inputData: {
                            input: [{ source: text }]
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const translated = data?.pipelineResponse?.[0]?.output?.[0]?.target;
                    if (translated) return translated;
                }
            } catch (apiError) {
                console.warn('Bhashini API call failed, falling back to local dictionary', apiError);
            }
        }

        // Fallback dictionary for common phrases
        return this.localDictionaryTranslate(text, targetLang);
    }

    /**
     * Text-To-Speech: Reads out text in regional language using Bhashini or Web Speech
     */
    async speakText(text, lang = 'hi') {
        if (!text) return;

        // Cancel existing speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Check if Bhashini TTS is configured
        if (this.isConfigured() && this.config.ttsTaskServiceId) {
            try {
                const response = await fetch(this.config.inferenceUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'userID': this.config.userID,
                        'ulcaApiKey': this.config.ulcaApiKey
                    },
                    body: JSON.stringify({
                        pipelineTasks: [
                            {
                                taskType: 'tts',
                                config: {
                                    language: { sourceLanguage: lang },
                                    gender: 'female',
                                    serviceId: this.config.ttsTaskServiceId
                                }
                            }
                        ],
                        inputData: {
                            input: [{ source: text }]
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const audioContent = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
                    if (audioContent) {
                        const audio = new Audio(`data:audio/wav;base64,${audioContent}`);
                        audio.play();
                        return;
                    }
                }
            } catch (err) {
                console.warn('Bhashini TTS failed, falling back to browser SpeechSynthesis', err);
            }
        }

        // Browser Fallback SpeechSynthesis
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const langCodeMap = {
                'en': 'en-IN',
                'hi': 'hi-IN',
                'bn': 'bn-IN',
                'te': 'te-IN',
                'mr': 'mr-IN',
                'ta': 'ta-IN',
                'gu': 'gu-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN',
                'pa': 'pa-IN',
                'or': 'or-IN',
                'as': 'as-IN',
                'ur': 'ur-IN'
            };
            utterance.lang = langCodeMap[lang] || 'en-IN';
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    }

    /**
     * Natural Language Requirement Parser
     * Extracts user parameters (category, occupation, age, gender, caste, income) from speech/text
     */
    parseCitizenQuery(rawQuery) {
        if (!rawQuery) return null;
        const q = rawQuery.toLowerCase();

        const extracted = {
            query: rawQuery,
            targetCategory: null,
            targetOccupation: null,
            targetGender: null,
            targetCaste: null,
            estimatedAge: null,
            estimatedIncome: null,
            keywords: []
        };

        // 1. Category and Occupation Extraction
        if (q.includes('farmer') || q.includes('kisan') || q.includes('kheti') || q.includes('agriculture') || q.includes('crop') || q.includes('fasal') || q.includes('krishi') || q.includes('zameen')) {
            extracted.targetCategory = 'agriculture';
            extracted.targetOccupation = 'farmer';
            extracted.keywords.push('farmer');
        } else if (q.includes('student') || q.includes('scholarship') || q.includes('chhatravritti') || q.includes('padhai') || q.includes('college') || q.includes('school') || q.includes('vidyarthi') || q.includes('education') || q.includes('b.tech') || q.includes('diploma') || q.includes('admission')) {
            extracted.targetCategory = 'students';
            extracted.targetOccupation = 'student';
            extracted.keywords.push('student', 'scholarship');
        } else if (q.includes('mahila') || q.includes('woman') || q.includes('women') || q.includes('aurat') || q.includes('girl') || q.includes('ladki') || q.includes('beti') || q.includes('maternity') || q.includes('garbhvati') || q.includes('pregnant') || q.includes('delivery')) {
            extracted.targetCategory = 'women';
            extracted.targetGender = 'female';
            extracted.keywords.push('women', 'girl child');
        } else if (q.includes('loan') || q.includes('karz') || q.includes('rin') || q.includes('mudra') || q.includes('bima') || q.includes('insurance') || q.includes('pension') || q.includes('bank') || q.includes('subsidy')) {
            extracted.targetCategory = 'financial';
            extracted.keywords.push('loan', 'financial');
        } else if (q.includes('hospital') || q.includes('ilaj') || q.includes('bimari') || q.includes('ayushman') || q.includes('dawa') || q.includes('treatment') || q.includes('health') || q.includes('doctor')) {
            extracted.targetCategory = 'health';
            extracted.keywords.push('health', 'ayushman');
        } else if (q.includes('makan') || q.includes('ghar') || q.includes('awas') || q.includes('housing') || q.includes('pucca') || q.includes('chhat')) {
            extracted.targetCategory = 'housing';
            extracted.keywords.push('housing', 'awas');
        } else if (q.includes('job') || q.includes('naukri') || q.includes('rojgar') || q.includes('kaushal') || q.includes('skill') || q.includes('training') || q.includes('vishwakarma') || q.includes('artisan') || q.includes('shramik') || q.includes('mazdoor') || q.includes('vendor') || q.includes('thela')) {
            extracted.targetCategory = 'skills';
            extracted.targetOccupation = 'worker';
            extracted.keywords.push('skills', 'employment');
        } else if (q.includes('divyang') || q.includes('viklang') || q.includes('handicapped') || q.includes('disability') || q.includes('wheelchair') || q.includes('senior') || q.includes('old age') || q.includes('bpl')) {
            extracted.targetCategory = 'social';
            extracted.keywords.push('social welfare');
        } else if (q.includes('business') || q.includes('startup') || q.includes('vyapar') || q.includes('dukan') || q.includes('factory') || q.includes('msme') || q.includes('enterprise')) {
            extracted.targetCategory = 'business';
            extracted.targetOccupation = 'self-employed';
            extracted.keywords.push('business', 'msme');
        }

        // 2. Gender extraction
        if (q.includes('female') || q.includes('girl') || q.includes('woman') || q.includes('mahila') || q.includes('ladki') || q.includes('stri')) {
            extracted.targetGender = 'female';
        } else if (q.includes('male') || q.includes('boy') || q.includes('purush') || q.includes('ladka')) {
            extracted.targetGender = 'male';
        }

        // 3. Caste / Category extraction
        if (q.includes('sc') || q.includes('scheduled caste') || q.includes('dalit')) {
            extracted.targetCaste = 'sc';
        } else if (q.includes('st') || q.includes('scheduled tribe') || q.includes('adivasi')) {
            extracted.targetCaste = 'st';
        } else if (q.includes('obc') || q.includes('backward')) {
            extracted.targetCaste = 'obc';
        } else if (q.includes('ews')) {
            extracted.targetCaste = 'ews';
        } else if (q.includes('minority') || q.includes('alpsankhyak')) {
            extracted.targetCaste = 'minority';
        }

        // 4. Age extraction (e.g., "22 saal", "age 19", "25 years old")
        const ageMatch = q.match(/(\d{1,2})\s*(?:saal|year|years|varsh|age)/i) || q.match(/(?:age|umra)\s*[:=]?\s*(\d{1,2})/i);
        if (ageMatch) {
            extracted.estimatedAge = parseInt(ageMatch[1], 10);
        }

        return extracted;
    }

    localDictionaryTranslate(text, targetLang) {
        if (window.t) {
            const translated = window.t(text, targetLang);
            if (translated && translated !== text) return translated;
        }
        if (targetLang === 'hi') {
            const dict = {
                'Home': 'होम',
                'Schemes': 'योजनाएं',
                'AI Matcher': 'एआई मिलान',
                'Eligibility': 'पात्रता',
                'Calculator': 'ईएमआई कैलकुलेटर',
                'OCR Scanner': 'दस्तावेज़ स्कैनर',
                'Contact': 'संपर्क करें',
                'Search Schemes': 'योजनाएं खोजें',
                'All Schemes': 'सभी योजनाएं',
                'Explore Welfare Schemes': 'कल्याणकारी योजनाएं देखें',
                'Verified Database': 'सत्यापित डेटाबेस',
                'Check Details': 'विवरण देखें',
                'Direct Apply': 'सीधा आवेदन',
                'Key Benefit': 'मुख्य लाभ',
                'Eligibility Criteria': 'पात्रता मानदंड',
                'Proceed to Official Portal': 'आधिकारिक पोर्टल पर जाएं',
                'No matching schemes found': 'कोई मेल खाती योजना नहीं मिली'
            };
            return dict[text] || text;
        }
        return text;
    }
}

// Instantiate and expose globally
if (typeof window !== 'undefined') {
    window.bhashini = new BhashiniService();
}
