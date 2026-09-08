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
}

// Instantiate and expose globally
if (typeof window !== 'undefined') {
    window.bhashini = new BhashiniService();
}
