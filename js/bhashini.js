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
            { code: 'mr', name: 'Marathi', native: 'मराठी', bhashiniCode: 'mr' },
            { code: 'te', name: 'Telugu', native: 'తెలుగు', bhashiniCode: 'te' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்', bhashiniCode: 'ta' },
            { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', bhashiniCode: 'gu' },
            { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', bhashiniCode: 'kn' },
            { code: 'ml', name: 'Malayalam', native: 'മലയാളം', bhashiniCode: 'ml' },
            { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', bhashiniCode: 'pa' },
            { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', bhashiniCode: 'or' },
            { code: 'as', name: 'Assamese', native: 'অসমীয়া', bhashiniCode: 'as' },
            { code: 'ur', name: 'Urdu', native: 'اردو', bhashiniCode: 'ur' }
        ];

        try {
            const savedLang = localStorage.getItem('sarthx_bhashini_lang') || localStorage.getItem('sarthx_language') || 'hi';
            this.currentLang = savedLang;
        } catch (e) {
            this.currentLang = 'hi';
        }

        this.speechRecognition = null;
        this.isListening = false;
        this.initSpeechRecognition();
    }

    setLanguage(lang) {
        if (this.languages.some(l => l.code === lang)) {
            this.currentLang = lang;
            try {
                localStorage.setItem('sarthx_bhashini_lang', lang);
            } catch (e) {}
            window.dispatchEvent(new CustomEvent('bhashini_language_changed', { detail: { lang } }));
            return true;
        }
        return false;
    }

    getSpeechLangCode(lang) {
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
        return langCodeMap[lang] || 'hi-IN';
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
        // Safe check for Web Speech API availability
        this.hasSpeechSupport = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!this.hasSpeechSupport) {
            console.warn('Web Speech API is not supported in this browser. Smart Voice Assistant modal fallback is active.');
        }
    }

    /**
     * Start speech recognition with automatic regional language mapping and reliable fallback
     */
    startVoiceRecognition({ lang = 'hi-IN', onStart, onResult, onError, onEnd, fallbackPromptTarget }) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

        // Clean up any stale recognition instance
        if (this.activeRecognition) {
            try { this.activeRecognition.abort(); } catch (e) {}
            this.activeRecognition = null;
        }
        this.isListening = false;

        if (SpeechRec) {
            try {
                const rec = new SpeechRec();
                rec.continuous = false;
                rec.interimResults = true;
                rec.maxAlternatives = 1;
                rec.lang = lang;
                this.activeRecognition = rec;

                rec.onstart = () => {
                    this.isListening = true;
                    if (onStart) onStart();
                };

                rec.onresult = (event) => {
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

                rec.onerror = (event) => {
                    this.isListening = false;
                    console.warn('SpeechRecognition status:', event.error);

                    // If error is not-allowed, service-not-allowed, or network (common on local file:// or mic blocked)
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'network' || event.error === 'audio-capture') {
                        this.openVoiceAssistantModal({ lang, onResult, fallbackPromptTarget, errorReason: event.error });
                    }
                    if (onError) onError(event.error);
                };

                rec.onend = () => {
                    this.isListening = false;
                    this.activeRecognition = null;
                    if (onEnd) onEnd();
                };

                rec.start();
                return true;
            } catch (err) {
                console.warn('Speech recognition start failed, opening voice assistant modal:', err);
                this.openVoiceAssistantModal({ lang, onResult, fallbackPromptTarget });
                if (onError) onError(err.message || 'Failed to start microphone');
                return false;
            }
        } else {
            // Browser does not support Web Speech API
            this.openVoiceAssistantModal({ lang, onResult, fallbackPromptTarget });
            if (onError) onError('Speech recognition is not natively supported in this browser.');
            return false;
        }
    }

    stopVoiceRecognition() {
        if (this.activeRecognition && this.isListening) {
            try { this.activeRecognition.stop(); } catch (e) {}
            this.isListening = false;
            this.activeRecognition = null;
        }
    }

    /**
     * Interactive Bhashini Voice Assistant Modal
     * Ensures voice input works seamlessly across all browsers, permissions, and local file:// protocols
     */
    openVoiceAssistantModal({ lang = 'hi-IN', onResult, fallbackPromptTarget, errorReason }) {
        let modal = document.getElementById('bhashiniVoiceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bhashiniVoiceModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }

        const langKey = (lang || 'hi-IN').split('-')[0].toLowerCase();
        const prompts = this.getQuickPrompts(langKey);
        const langObj = this.languages[langKey] || { name: 'हिन्दी', code: 'hi' };

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 540px; text-align: center; padding: 32px 24px;">
                <button class="modal-close-btn" onclick="window.bhashini.closeVoiceAssistantModal()"><i class="fa-solid fa-xmark"></i></button>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
                    <span class="scheme-badge" style="background: rgba(16,185,129,0.15); color: var(--primary); font-size: 0.8rem;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> MeitY Bhashini AI Voice
                    </span>
                    <span class="scheme-badge" style="background: rgba(37,99,235,0.12); color: #2563eb; font-size: 0.8rem;">
                        <i class="fa-solid fa-language"></i> ${langObj.name} (${lang})
                    </span>
                </div>

                <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
                    Bhashini Voice Assistant
                </h3>
                <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 20px;">
                    Speak in <strong>${langObj.name}</strong> or select a prompt below:
                </p>

                <div class="voice-waveform-container" style="display: flex; align-items: center; justify-content: center; gap: 6px; height: 50px; margin-bottom: 18px;">
                    <div class="waveform-bar bar-1"></div>
                    <div class="waveform-bar bar-2"></div>
                    <div class="waveform-bar bar-3"></div>
                    <div class="waveform-bar bar-4"></div>
                    <div class="waveform-bar bar-5"></div>
                </div>

                <div style="margin-bottom: 18px;">
                    <input type="text" id="bhashiniVoiceTranscript" class="form-input" placeholder="Listening... your spoken words will appear here" style="text-align: center; font-size: 1rem; font-weight: 600; padding: 14px;">
                </div>

                ${errorReason === 'not-allowed' ? `
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 14px; font-size: 0.78rem; color: #d97706; margin-bottom: 16px; text-align: left;">
                        <i class="fa-solid fa-triangle-exclamation"></i> <strong>Note:</strong> Browser microphone access is restricted on local file URLs. You can select any sample query below or type directly:
                    </div>
                ` : ''}

                <div style="text-align: left; margin-bottom: 18px;">
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
                        <i class="fa-solid fa-sparkles" style="color: var(--primary);"></i> Sample Spoken Queries (${langObj.name})
                    </span>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${prompts.map(p => `
                            <button type="button" class="voice-prompt-choice" onclick="window.bhashini.selectVoicePrompt('${p.replace(/'/g, "\\'")}')" style="background: var(--bg-card-hover); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s ease;">
                                <i class="fa-solid fa-volume-high" style="color: var(--primary); font-size: 0.9rem;"></i>
                                <span>"${p}"</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button type="button" class="btn-auto-fill-gov" onclick="window.bhashini.submitVoiceTranscript()" style="flex: 1.5; padding: 12px; border-radius: var(--radius-pill); font-size: 0.95rem;">
                        <i class="fa-solid fa-paper-plane"></i> Submit Query
                    </button>
                    <button type="button" class="check-details-btn" onclick="window.bhashini.closeVoiceAssistantModal()" style="flex: 1; padding: 12px; border-radius: var(--radius-pill);">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        this.currentVoiceCallback = onResult;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    selectVoicePrompt(text) {
        const input = document.getElementById('bhashiniVoiceTranscript');
        if (input) input.value = text;
        this.submitVoiceTranscript();
    }

    submitVoiceTranscript() {
        const input = document.getElementById('bhashiniVoiceTranscript');
        const text = input ? input.value.trim() : '';
        if (text && this.currentVoiceCallback) {
            this.currentVoiceCallback({
                finalText: text,
                interimText: '',
                isFinal: true
            });
        }
        this.closeVoiceAssistantModal();
    }

    closeVoiceAssistantModal() {
        const modal = document.getElementById('bhashiniVoiceModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.stopVoiceRecognition();
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
            const targetCode = langCodeMap[lang] || 'en-IN';
            utterance.lang = targetCode;

            // Select best native voice if available in browser
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                const matchedVoice = voices.find(v => v.lang === targetCode || v.lang.replace('_', '-').startsWith(lang));
                if (matchedVoice) utterance.voice = matchedVoice;
            }

            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    }

    /**
     * Natural Language Requirement Parser
     * Extracts user parameters (category, occupation, age, gender, caste, income) from speech/text
     * Supports queries across 13 Indian languages (English, Hindi, Bengali, Marathi, Telugu, Tamil, etc.)
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

        // 1. Agriculture / Farmer (en, hi, bn, mr, te, ta, gu, kn, ml, pa, or, as, ur)
        if (q.includes('farmer') || q.includes('kisan') || q.includes('kheti') || q.includes('agriculture') || 
            q.includes('crop') || q.includes('fasal') || q.includes('krishi') || q.includes('zameen') ||
            q.includes('কৃষক') || q.includes('কৃষি') || q.includes('চাষ') || // Bengali / Assamese
            q.includes('शेतकरी') || q.includes('शेती') || // Marathi
            q.includes('రైతు') || q.includes('వ్యవసాయం') || // Telugu
            q.includes('விவசாயி') || q.includes('விவசாயம்') || // Tamil
            q.includes('ખેડૂત') || q.includes('ખેતી') || // Gujarati
            q.includes('ರೈತ') || q.includes('ಕೃಷಿ') || // Kannada
            q.includes('കർഷകൻ') || q.includes('കൃഷി') || // Malayalam
            q.includes('ਕਿਸਾਨ') || q.includes('ਖੇਤੀ') || // Punjabi
            q.includes('କୃଷକ') || q.includes('ଚାଷ') || // Odia
            q.includes('کسان') || q.includes('کھیتی')) { // Urdu
            extracted.targetCategory = 'agriculture';
            extracted.targetOccupation = 'farmer';
            extracted.keywords.push('farmer', 'agriculture');
        } 
        // 2. Education / Student
        else if (q.includes('student') || q.includes('scholarship') || q.includes('chhatravritti') || q.includes('padhai') || 
                 q.includes('college') || q.includes('school') || q.includes('vidyarthi') || q.includes('education') || 
                 q.includes('b.tech') || q.includes('diploma') || q.includes('admission') ||
                 q.includes('ছাত্র') || q.includes('শিক্ষা') || q.includes('বৃত্তি') || // Bengali
                 q.includes('विद्यार्थी') || q.includes('शिक्षण') || q.includes('शिष्यवृत्ती') || // Marathi
                 q.includes('విద్యార్థి') || q.includes('స్కాలర్‌షిప్') || q.includes('చదువు') || // Telugu
                 q.includes('மாணவர்') || q.includes('கல்வி') || q.includes('உதவித்தொகை') || // Tamil
                 q.includes('વિદ્યાર્થી') || q.includes('શિષ્યવૃત્તિ') || // Gujarati
                 q.includes('ವಿದ್ಯಾರ್ಥಿ') || q.includes('ಶಿಕ್ಷಣ') || // Kannada
                 q.includes('വിദ്യാർത്ഥി') || q.includes('പഠനം') || // Malayalam
                 q.includes('ਵਿਦਿਆਰਥੀ') || q.includes('ਵਜ਼ੀਫ਼ਾ') || // Punjabi
                 q.includes('ଛାତ୍ର') || q.includes('ଶିକ୍ଷା') || // Odia
                 q.includes('طالب علم') || q.includes('وظیفہ')) { // Urdu
            extracted.targetCategory = 'students';
            extracted.targetOccupation = 'student';
            extracted.keywords.push('student', 'scholarship');
        } 
        // 3. Women & Child
        else if (q.includes('mahila') || q.includes('woman') || q.includes('women') || q.includes('aurat') || 
                 q.includes('girl') || q.includes('ladki') || q.includes('beti') || q.includes('maternity') || 
                 q.includes('garbhvati') || q.includes('pregnant') || q.includes('delivery') ||
                 q.includes('মহিলা') || q.includes('মেয়ে') || q.includes('কন্যা') || // Bengali
                 q.includes('स्त्री') || q.includes('मुलगी') || // Marathi
                 q.includes('మహిళ') || q.includes('ఆడపిల్ల') || // Telugu
                 q.includes('பெண்') || q.includes('மகள்') || // Tamil
                 q.includes('મહિલા') || q.includes('દીકરી') || // Gujarati
                 q.includes('ಮಹಿಳೆ') || q.includes('ಹೆಣ್ಣುಮಗಳು') || // Kannada
                 q.includes('സ്ത്രീ') || q.includes('പെൺകുട്ടി') || // Malayalam
                 q.includes('ਔਰਤ') || q.includes('ਧੀ') || // Punjabi
                 q.includes('ମହିଳା') || q.includes('ଝିଅ') || // Odia
                 q.includes('عورت') || q.includes('لڑکی') || q.includes('بیٹی')) { // Urdu
            extracted.targetCategory = 'women';
            extracted.targetGender = 'female';
            extracted.keywords.push('women', 'girl child');
        } 
        // 4. Financial & Loans
        else if (q.includes('loan') || q.includes('karz') || q.includes('rin') || q.includes('mudra') || 
                 q.includes('bima') || q.includes('insurance') || q.includes('pension') || q.includes('bank') || q.includes('subsidy') ||
                 q.includes('ঋণ') || q.includes('বীমা') || // Bengali
                 q.includes('कर्ज') || q.includes('विमा') || // Marathi
                 q.includes('రుణం') || q.includes('బీమా') || // Telugu
                 q.includes('கடன்') || q.includes('காப்பீடு') || // Tamil
                 q.includes('ધિરાણ') || q.includes('વીમો') || // Gujarati
                 q.includes('ಸಾಲ') || q.includes('ವಿಮೆ') || // Kannada
                 q.includes('വായ്പ') || q.includes('ഇൻഷുറൻസ്') || // Malayalam
                 q.includes('ਕਰਜ਼ਾ') || q.includes('ਬੀਮਾ') || // Punjabi
                 q.includes('ଋଣ') || q.includes('ବୀମା') || // Odia
                 q.includes('قرض') || q.includes('بیمہ')) { // Urdu
            extracted.targetCategory = 'financial';
            extracted.keywords.push('loan', 'financial');
        } 
        // 5. Health & Wellness
        else if (q.includes('hospital') || q.includes('ilaj') || q.includes('bimari') || q.includes('ayushman') || 
                 q.includes('dawa') || q.includes('treatment') || q.includes('health') || q.includes('doctor') ||
                 q.includes('চিকিৎসা') || q.includes('হাসপাতাল') || q.includes('ওষুধ') || // Bengali
                 q.includes('आरोग्य') || q.includes('दवाखाना') || q.includes('उपचार') || // Marathi
                 q.includes('ఆరోగ్యం') || q.includes('చికిత్స') || q.includes('ఆసుపత్రి') || // Telugu
                 q.includes('மருத்துவம்') || q.includes('சிகிச்சை') || q.includes('மருத்துவமனை') || // Tamil
                 q.includes('આરોગ્ય') || q.includes('હોસ્પિટલ') || q.includes('દવા') || // Gujarati
                 q.includes('ಆರೋಗ್ಯ') || q.includes('ಆಸ್ಪತ್ರೆ') || q.includes('ಚಿಕಿತ್ಸೆ') || // Kannada
                 q.includes('ആരോഗ്യം') || q.includes('ആശുപത്രി') || q.includes('ചികിത്സ') || // Malayalam
                 q.includes('ਇਲਾਜ') || q.includes('ਹਸਪਤਾਲ') || // Punjabi
                 q.includes('ସ୍ୱାସ୍ଥ୍ୟ') || q.includes('ଡାକ୍ତରଖାନା') || // Odia
                 q.includes('علاج') || q.includes('ہسپتال') || q.includes('صحت')) { // Urdu
            extracted.targetCategory = 'health';
            extracted.keywords.push('health', 'ayushman');
        } 
        // 6. Housing & Shelter
        else if (q.includes('makan') || q.includes('ghar') || q.includes('awas') || q.includes('housing') || 
                 q.includes('pucca') || q.includes('chhat') ||
                 q.includes('বাড়ি') || q.includes('ঘর') || q.includes('আবাসন') || // Bengali
                 q.includes('घर') || q.includes('आवास') || // Marathi
                 q.includes('ఇల్లు') || q.includes('గృహం') || // Telugu
                 q.includes('வீடு') || q.includes('குடியிருப்பு') || // Tamil
                 q.includes('મકાન') || q.includes('આવાસ') || // Gujarati
                 q.includes('ಮನೆ') || q.includes('ವಸತಿ') || // Kannada
                 q.includes('വീട്') || q.includes('ഭവനം') || // Malayalam
                 q.includes('ਮਕਾਨ') || q.includes('ਘਰ') || // Punjabi
                 q.includes('ଘର') || q.includes('ବାସଗୃହ') || // Odia
                 q.includes('مکان') || q.includes('گھر')) { // Urdu
            extracted.targetCategory = 'housing';
            extracted.keywords.push('housing', 'awas');
        } 
        // 7. Skills & Employment
        else if (q.includes('job') || q.includes('naukri') || q.includes('rojgar') || q.includes('kaushal') || 
                 q.includes('skill') || q.includes('training') || q.includes('vishwakarma') || q.includes('artisan') || 
                 q.includes('shramik') || q.includes('mazdoor') || q.includes('vendor') || q.includes('thela') ||
                 q.includes('চাকরি') || q.includes('কর্মসংস্থান') || q.includes('দক্ষতা') || // Bengali
                 q.includes('नोकरी') || q.includes('रोजगार') || q.includes('कौशल्य') || // Marathi
                 q.includes('ఉద్యోగం') || q.includes('నైపుణ్యం') || q.includes('ఉపాధి') || // Telugu
                 q.includes('வேலை') || q.includes('திறன்') || q.includes('தொழில்') || // Tamil
                 q.includes('નોકરી') || q.includes('રોજગાર') || q.includes('કૌશલ્ય') || // Gujarati
                 q.includes('ಕೆಲಸ') || q.includes('ಉದ್ಯೋಗ') || q.includes('ಕೌಶಲ್ಯ') || // Kannada
                 q.includes('ജോലി') || q.includes('തൊഴിൽ') || // Malayalam
                 q.includes('ਨੌਕਰੀ') || q.includes('ਰੋਜ਼ਗਾਰ') || // Punjabi
                 q.includes('ଚାକିରି') || q.includes('ନିଯୁକ୍ତି') || // Odia
                 q.includes('ملازمت') || q.includes('نوکری') || q.includes('روزگار')) { // Urdu
            extracted.targetCategory = 'skills';
            extracted.targetOccupation = 'worker';
            extracted.keywords.push('skills', 'employment');
        } 
        // 8. Social Welfare & Disability
        else if (q.includes('divyang') || q.includes('viklang') || q.includes('handicapped') || q.includes('disability') || 
                 q.includes('wheelchair') || q.includes('senior') || q.includes('old age') || q.includes('bpl') ||
                 q.includes('প্রতিবন্ধী') || q.includes('বয়স্ক') || // Bengali
                 q.includes('अपंग') || q.includes('दिव्यांग') || q.includes('वृद्ध') || // Marathi
                 q.includes('దివ్యాంగులు') || q.includes('వృద్ధులు') || // Telugu
                 q.includes('மாற்றுத்திறனாளி') || q.includes('முதியோர்') || // Tamil
                 q.includes('દિવ્યાંગ') || q.includes('વૃદ્ધ') || // Gujarati
                 q.includes('ವಿಕಲಚೇತನ') || q.includes('ಹಿರಿಯ ನಾಗರಿಕ') || // Kannada
                 q.includes('ഭിന്നശേഷി') || q.includes('മുതിർന്ന പൗരൻ') || // Malayalam
                 q.includes('ਦਿਵਿਆਂਗ') || q.includes('ਬਜ਼ੁਰਗ') || // Punjabi
                 q.includes('ଦିବ୍ୟାଙ୍ଗ') || q.includes('ବୃଦ୍ଧ') || // Odia
                 q.includes('معذور') || q.includes('بزرگ')) { // Urdu
            extracted.targetCategory = 'social';
            extracted.keywords.push('social welfare');
        } 
        // 9. Business & MSME
        else if (q.includes('business') || q.includes('startup') || q.includes('vyapar') || q.includes('dukan') || 
                 q.includes('factory') || q.includes('msme') || q.includes('enterprise') ||
                 q.includes('ব্যবসা') || q.includes('উদ্যোগ') || // Bengali
                 q.includes('व्यवसाय') || q.includes('उद्योग') || // Marathi
                 q.includes('వ్యాపారం') || q.includes('పరిశ్రమ') || // Telugu
                 q.includes('வணிகம்') || q.includes('தொழில்முனைவோர்') || // Tamil
                 q.includes('વેપાર') || q.includes('ધંધો') || // Gujarati
                 q.includes('ವ್ಯಾಪಾರ') || q.includes('ಉದ್ಯಮ') || // Kannada
                 q.includes('വ്യാപാരം') || q.includes('സംരംഭം') || // Malayalam
                 q.includes('ਵਪਾਰ') || q.includes('ਕਾਰੋਬਾਰ') || // Punjabi
                 q.includes('ବ୍ୟବସାୟ') || q.includes('ଉଦ୍ୟୋଗ') || // Odia
                 q.includes('کاروبار') || q.includes('تجارت')) { // Urdu
            extracted.targetCategory = 'business';
            extracted.targetOccupation = 'self-employed';
            extracted.keywords.push('business', 'msme');
        }

        // Gender extraction
        if (q.includes('female') || q.includes('girl') || q.includes('woman') || q.includes('mahila') || 
            q.includes('ladki') || q.includes('stri') || q.includes('মহিলা') || q.includes('స్త్రీ') || 
            q.includes('பெண்') || q.includes('عورت')) {
            extracted.targetGender = 'female';
        } else if (q.includes('male') || q.includes('boy') || q.includes('purush') || q.includes('ladka') || 
                   q.includes('পুরুষ') || q.includes('పురుషుడు') || q.includes('ஆண்') || q.includes('مرد')) {
            extracted.targetGender = 'male';
        }

        // Caste extraction
        if (q.includes('sc') || q.includes('scheduled caste') || q.includes('dalit') || q.includes('दलित')) {
            extracted.targetCaste = 'sc';
        } else if (q.includes('st') || q.includes('scheduled tribe') || q.includes('adivasi') || q.includes('आदिवासी')) {
            extracted.targetCaste = 'st';
        } else if (q.includes('obc') || q.includes('backward') || q.includes('पिछड़ा')) {
            extracted.targetCaste = 'obc';
        } else if (q.includes('ews')) {
            extracted.targetCaste = 'ews';
        } else if (q.includes('minority') || q.includes('alpsankhyak') || q.includes('अल्पसंख्यक')) {
            extracted.targetCaste = 'minority';
        }

        // Age extraction (e.g., "22 saal", "age 19", "25 years old", "वय 25")
        const ageMatch = q.match(/(\d{1,2})\s*(?:saal|year|years|varsh|age|বছর|वय|సంవత్సరాలు|வயது)/i) || 
                         q.match(/(?:age|umra|वय|বয়স|వయస్సు|வயது)\s*[:=]?\s*(\d{1,2})/i);
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

    /**
     * Multilingual quick prompts for instant 1-tap voice/text testing
     */
    getQuickPrompts(lang) {
        const langCode = lang || this.currentLang || 'hi';
        const prompts = {
            en: [
                { icon: "fa-seedling", text: "I am a small farmer looking for loan or PM-Kisan subsidy" },
                { icon: "fa-graduation-cap", text: "I am a college student searching for scholarship" },
                { icon: "fa-briefcase", text: "Need collateral-free business loan under Mudra" },
                { icon: "fa-house", text: "Looking for PM Awas housing assistance" }
            ],
            hi: [
                { icon: "fa-seedling", text: "मैं एक किसान हूँ और फसल बीमा या पीएम-किसान सहायता चाहिए" },
                { icon: "fa-graduation-cap", text: "मैं एक छात्र हूँ मुझे स्कॉलरशिप या शिक्षा सहायता चाहिए" },
                { icon: "fa-briefcase", text: "छोटा व्यापार शुरू करने के लिए मुद्रा लोन चाहिए" },
                { icon: "fa-house", text: "पीएम आवास योजना में पक्का मकान सहायता चाहिए" }
            ],
            bn: [
                { icon: "fa-seedling", text: "আমি একজন কৃষক, ফসল বীমা ও কিষাণ ক্রেডিট কার্ড চাই" },
                { icon: "fa-graduation-cap", text: "আমি একজন ছাত্র, উচ্চশিক্ষার জন্য সরকারি স্কলারশিপ দরকার" },
                { icon: "fa-briefcase", text: "ব্যবসার জন্য জামানতমুক্ত মুদ্রা ঋণ ও সরকারি অনুদান চাই" },
                { icon: "fa-house", text: "প্রধানমন্ত্রী আবাস যোজনায় পাকা বাড়ি তৈরির সহায়তা চাই" }
            ],
            mr: [
                { icon: "fa-seedling", text: "मी शेतकरी आहे, मला पीक विमा आणि कर्ज योजना हवी आहे" },
                { icon: "fa-graduation-cap", text: "मी विद्यार्थी आहे, मला उच्च शिक्षणासाठी शिष्यवृत्ती हवी" },
                { icon: "fa-briefcase", text: "नवीन व्यवसायासाठी मुद्रा कर्ज आणि सरकारी अनुदान हवे" },
                { icon: "fa-house", text: "प्रधानमंत्री आवास योजनेअंतर्गत पक्के घर हवे" }
            ],
            te: [
                { icon: "fa-seedling", text: "నేను రైతును, నాకు పంట బీమా మరియు పీఎం కిసాన్ కావాలి" },
                { icon: "fa-graduation-cap", text: "నేను విద్యార్థిని, నాకు స్కాలర్‌షిప్ మరియు విద్యా సహాయం కావాలి" },
                { icon: "fa-briefcase", text: "వ్యాపారం కోసం పూచీకత్తు లేని ముద్రా రుణం కావాలి" },
                { icon: "fa-house", text: "పీఎం ఆవాస్ యోజన కింద పక్కా ఇల్లు కావాలి" }
            ],
            ta: [
                { icon: "fa-seedling", text: "நான் ஒரு விவசாயி, எனக்கு பயிர் காப்பீடு மற்றும் கிசான் உதவி வேண்டும்" },
                { icon: "fa-graduation-cap", text: "நான் ஒரு மாணவர், உயர்கல்வி உதவித்தொகை தேவை" },
                { icon: "fa-briefcase", text: "சிறு தொழிலுக்கு முத்ரா கடன் மற்றும் மானியம் தேவை" },
                { icon: "fa-house", text: "பிரதமர் ஆவாஸ் திட்டத்தில் சொந்த வீடு உதவி வேண்டும்" }
            ],
            gu: [
                { icon: "fa-seedling", text: "હું ખેડૂત છું, પાક વીમો અને કિસાન ક્રેડિટ કાર્ડ જોઈએ છે" },
                { icon: "fa-graduation-cap", text: "હું વિદ્યાર્થી છું, મને ઉચ્ચ અભ્યાસ માટે શિષ્યવૃત્તિ જોઈએ" },
                { icon: "fa-briefcase", text: "વેપાર શરૂ કરવા મુદ્રા લોન અને સબસિડી જોઈએ" },
                { icon: "fa-house", text: "પ્રધાનમંત્રી આવાસ યોજનામાં પાકું મકાન જોઈએ" }
            ],
            kn: [
                { icon: "fa-seedling", text: "ನಾನು ರೈತ, ನನಗೆ ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಬೇಕು" },
                { icon: "fa-graduation-cap", text: "ನಾನು ವಿದ್ಯಾರ್ಥಿ, ನನಗೆ ಉನ್ನತ ಶಿಕ್ಷಣಕ್ಕೆ ವಿದ್ಯಾರ್ಥಿವೇತನ ಬೇಕು" },
                { icon: "fa-briefcase", text: "ಉದ್ಯಮಕ್ಕಾಗಿ ಮುದ್ರಾ ಸಾಲ ಮತ್ತು ಸಬ್ಸಿಡಿ ಬೇಕು" },
                { icon: "fa-house", text: "ಪಿಎಂ ಆವಾಸ್ ಯೋಜನೆಯಲ್ಲಿ ಮನೆ ನಿರ್ಮಾಣ ಸಹಾಯ ಬೇಕು" }
            ],
            ml: [
                { icon: "fa-seedling", text: "ഞാൻ കർഷകനാണ്, വിള ഇൻഷുറൻസും കിസാൻ സഹായവും വേണം" },
                { icon: "fa-graduation-cap", text: "ഞാൻ വിദ്യാർത്ഥിയാണ്, സ്കോളർഷിപ്പും വിദ്യാഭ്യാസ വായ്പയും വേണം" },
                { icon: "fa-briefcase", text: "ബിസിനസ്സിന് മുദ്ര വായ്പയും സബ്‌സിഡിയും വേണം" },
                { icon: "fa-house", text: "പ്രധാനമന്ത്രി ആവാസ് പദ്ധതിയിൽ വീട് വേണം" }
            ],
            pa: [
                { icon: "fa-seedling", text: "ਮੈਂ ਕਿਸਾਨ ਹਾਂ, ਮੈਨੂੰ ਫਸਲ ਬੀਮਾ ਅਤੇ ਪੀਐਮ ਕਿਸਾਨ ਸਹਾਇਤਾ ਚਾਹੀਦੀ ਹੈ" },
                { icon: "fa-graduation-cap", text: "ਮੈਂ ਵਿਦਿਆਰਥੀ ਹਾਂ, ਮੈਨੂੰ ਉੱਚ ਸਿੱਖਿਆ ਲਈ ਵਜ਼ੀਫ਼ਾ ਚਾਹੀਦਾ ਹੈ" },
                { icon: "fa-briefcase", text: "ਕਾਰੋਬਾਰ ਲਈ ਮੁਦਰਾ ਕਰਜ਼ਾ ਅਤੇ ਸਬਸਿਡੀ ਚਾਹੀਦੀ ਹੈ" },
                { icon: "fa-house", text: "ਪੀਐਮ ਆਵਾਸ ਯੋਜਨਾ ਵਿੱਚ ਪੱਕਾ ਮਕਾਨ ਚਾਹੀਦਾ ਹੈ" }
            ],
            or: [
                { icon: "fa-seedling", text: "ମୁଁ ଜଣେ କୃଷକ, ମୋତେ ଫସଲ ବୀମା ଏବଂ ପିଏମ କିଷାନ ସହାୟତା ଦରକାର" },
                { icon: "fa-graduation-cap", text: "ମୁଁ ଜଣେ ଛାତ୍ର, ମୋତେ ଉଚ୍ଚଶିକ୍ଷା ପାଇଁ ବୃତ୍ତି ଦରକାର" },
                { icon: "fa-briefcase", text: "ବ୍ୟବସାୟ ପାଇଁ ମୁଦ୍ରା ଋଣ ଏବଂ ସବସିଡି ଦରକାର" },
                { icon: "fa-house", text: "ପିଏମ ଆବାସ ଯୋଜନାରେ ପକ୍କା ଘର ସହାୟତା ଦରକାର" }
            ],
            as: [
                { icon: "fa-seedling", text: "মই এজন কৃষক, শস্য বীমা আৰু কিষাণ ক্ৰেডিট কাৰ্ড লাগে" },
                { icon: "fa-graduation-cap", text: "মই এজন ছাত্ৰ, মোক উচ্চ শিক্ষাৰ বৃত্তি লাগে" },
                { icon: "fa-briefcase", text: "ব্যৱসায়ৰ বাবে মুদ্ৰা ঋণ আৰু ৰাজসাহায্য লাগে" },
                { icon: "fa-house", text: "প্ৰধানমন্ত্ৰী আৱাস যোজনাত ঘৰ নিৰ্মাণ সাহায্য লাগে" }
            ],
            ur: [
                { icon: "fa-seedling", text: "میں ایک کسان ہوں، مجھے فصل بیمہ اور کسان کریڈٹ کارڈ چاہیے" },
                { icon: "fa-graduation-cap", text: "میں ایک طالب علم ہوں، مجھے اعلیٰ تعلیم کے لیے وظیفہ چاہیے" },
                { icon: "fa-briefcase", text: "کاروبار کے لیے مدرا قرض اور سبسڈی چاہیے" },
                { icon: "fa-house", text: "پی ایم آواس یوجنا کے تحت مکان کی امداد چاہیے" }
            ]
        };
        return prompts[langCode] || prompts['hi'] || prompts['en'];
    }

    /**
     * Generate spoken & written assistant responses in the selected Indian language
     */
    generateAssistantResponse(parsedResult, matchCount, lang) {
        const langCode = lang || this.currentLang || 'hi';
        const responses = {
            en: `Found ${matchCount} official welfare schemes matching your profile. You can review details or apply directly via SarthX Gov Bridge.`,
            hi: `आपकी आवश्यकता के अनुसार ${matchCount} सरकारी कल्याणकारी योजनाएं मिली हैं। आप विवरण देख सकते हैं या सीधे आवेदन कर सकते हैं।`,
            bn: `আপনার প্রোফাইল অনুযায়ী ${matchCount}টি সরকারি কল্যাণমূলক প্রকল্প পাওয়া গেছে। বিস্তারিত দেখুন অথবা সরাসরি আবেদন করুন।`,
            mr: `तुमच्या गरजेनुसार ${matchCount} अधिकृत सरकारी योजना शोधल्या आहेत. तपशील तपासा किंवा थेट अर्ज करा.`,
            te: `మీ ప్రొఫైల్ ఆధారంగా ${matchCount} అధికారిక ప్రభుత్వ సంక్షేమ పథకాలు కనుగొనబడ్డాయి. వివరాలు చూడండి లేదా దరఖాస్తు చేసుకోండి.`,
            ta: `உங்கள் தேவைகளுக்கேற்ப ${matchCount} அரசு நலத்திட்டங்கள் கண்டறியப்பட்டுள்ளன. விவரங்களை சரிபார்க்கவும் அல்லது நேரடியாக விண்ணப்பிக்கவும்.`,
            gu: `તમારી જરૂરિયાત અનુસાર ${matchCount} સરકારી કલ્યાણ યોજનાઓ મળી છે. વિગતો તપાસો અથવા સીધી અરજી કરો.`,
            kn: `ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕಂತೆ ${matchCount} ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ದೊರೆತಿವೆ. ವಿವರಗಳನ್ನು ನೋಡಿ ಅಥವಾ ನೇರವಾಗಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.`,
            ml: `നിങ്ങളുടെ ആവശ്യപ്രകാരം ${matchCount} സർക്കാർ ക്ഷേമപദ്ധതികൾ കണ്ടെത്തിയിട്ടുണ്ട്. വിശദാംശങ്ങൾ പരിശോധിക്കുകയോ അപേക്ഷിക്കുകയോ ചെയ്യാം.`,
            pa: `ਤੁਹਾਡੀ ਲੋੜ ਅਨੁਸਾਰ ${matchCount} ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਮਿਲੀਆਂ ਹਨ। ਵੇਰਵੇ ਦੇਖੋ ਜਾਂ ਸਿੱਧਾ ਅਪਲਾਈ ਕਰੋ।`,
            or: `ଆପଣଙ୍କ ଆବଶ୍ୟକତା ଅନୁଯାୟୀ ${matchCount}ଟି ସରକାରୀ ଯୋଜନା ମିଳିଛି। ବିବରଣୀ ଦେଖନ୍ତୁ କିମ୍ବା ଆବେଦନ କରନ୍ତୁ।`,
            as: `আপোনাৰ প্ৰয়োজন অনুসৰি ${matchCount}খন চৰকাৰী আঁচনি পোৱা গৈছে। সবিশেষ চাওক বা পোনপটীয়াকৈ আবেদন কৰক।`,
            ur: `آپ کی ضرورت کے مطابق ${matchCount} سرکاری فلاحی اسکیمیں مل گئی ہیں۔ تفصیلات دیکھیں یا براہ راست درخواست دیں۔`
        };

        return responses[langCode] || responses['hi'] || responses['en'];
    }
}

// Instantiate and expose globally
if (typeof window !== 'undefined') {
    window.bhashini = new BhashiniService();
}

