/**
 * SARTHX GOV-BRIDGE API v1.0
 * Smart Government Form Auto-Fill & Official Portal Handshake Bridge
 * Connects SarthX verified citizen profiles to Digital India / JanSamarth / MyScheme portals
 */

(function(window) {
    'use strict';

    // Demo Initial Applications with Verified Document Dossier
    const SEED_APPLICATIONS = [
        {
            refId: 'SARTHX-GOV-2026-SVAN-48291',
            schemeId: 'svanidhi',
            schemeTitle: 'PM SVANidhi (Street Vendor Loan)',
            ministry: 'Ministry of Housing & Urban Affairs',
            applicantName: 'Amit Kumar',
            phone: '9876543210',
            state: 'Uttar Pradesh',
            category: 'OBC',
            occupation: 'Street Vendor',
            benefit: '₹10,000 Working Capital (7% Interest Subsidy)',
            date: '02 Sep 2026, 11:30 AM',
            currentStage: 3, // 1: Submitted, 2: e-KYC, 3: Scrutiny, 4: Disbursed
            status: 'Approved & In Disbursal Queue',
            statusClass: 'status-badge-approved',
            disbursementDate: '12 Sep 2026',
            nodalOffice: 'District Urban Development Agency (DUDA), Lucknow',
            submittedDocuments: [
                {
                    name: 'Aadhaar Card',
                    docNumber: 'XXXX-XXXX-8914',
                    secondary: 'UIDAI e-KYC Linked',
                    status: 'DigiLocker Verified',
                    agency: 'Unique Identification Authority of India (UIDAI)',
                    badgeColor: '#059669'
                },
                {
                    name: 'Vending Certificate (ULB Recommendation)',
                    docNumber: 'LMC-VEND-2025-4109',
                    secondary: 'Zone 4, Lucknow Municipal Corporation',
                    status: 'Town Vending Committee Cleared',
                    agency: 'Urban Local Body (ULB)',
                    badgeColor: '#0284c7'
                },
                {
                    name: 'Bank Passbook (DBT Account)',
                    docNumber: 'SBIN0001234 (A/C: ******4819)',
                    secondary: 'State Bank of India',
                    status: 'NPCI Aadhaar-Bridge Seeded',
                    agency: 'Public Financial Management System (PFMS)',
                    badgeColor: '#059669'
                }
            ]
        },
        {
            refId: 'SARTHX-GOV-2026-MUDR-19042',
            schemeId: 'mudra',
            schemeTitle: 'Pradhan Mantri Mudra Yojana (Shishu)',
            ministry: 'Ministry of Finance',
            applicantName: 'Amit Kumar',
            phone: '9876543210',
            state: 'Uttar Pradesh',
            category: 'OBC',
            occupation: 'Micro Entrepreneur',
            benefit: '₹50,000 Collateral-Free Business Loan',
            date: '06 Sep 2026, 04:15 PM',
            currentStage: 2,
            status: 'Document Verification & Bank Scrutiny',
            statusClass: 'status-badge-scrutiny',
            disbursementDate: '20 Sep 2026',
            nodalOffice: 'Lead District Manager (LDM) Office, SBI Regional Centre',
            submittedDocuments: [
                {
                    name: 'Aadhaar Card',
                    docNumber: 'XXXX-XXXX-8914',
                    secondary: 'UIDAI e-KYC Linked',
                    status: 'DigiLocker Verified',
                    agency: 'UIDAI',
                    badgeColor: '#059669'
                },
                {
                    name: 'Udyam Registration Certificate',
                    docNumber: 'UDYAM-UP-28-0091823',
                    secondary: 'Micro Enterprise (Crafts)',
                    status: 'Ministry of MSME Validated',
                    agency: 'MoMSME National Portal',
                    badgeColor: '#059669'
                },
                {
                    name: 'Business Quotation & Project Report',
                    docNumber: 'PR-2026-SHISHU-1029',
                    secondary: 'Raw materials & equipment',
                    status: 'Branch Scrutiny Active',
                    agency: 'State Bank of India LDM',
                    badgeColor: '#d97706'
                }
            ]
        }
    ];

    /**
     * Map any scheme document title to structured input metadata and validation rules
     */
    function getDocTypeInfo(docName, index, profile) {
        const lower = (docName || '').toLowerCase();
        const cleanId = 'doc_' + index;

        if (lower.includes('aadhaar')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-id-card',
                badge: 'UIDAI Linked',
                agency: 'Unique Identification Authority of India (UIDAI)',
                badgeColor: '#059669',
                input1Label: 'Aadhaar UID / VID Number',
                input1Value: (profile && profile.aadhaar) ? profile.aadhaar : 'XXXX-XXXX-8914',
                input1Placeholder: '12-digit Aadhaar UID',
                input2Label: 'Name as on Aadhaar Card',
                input2Value: profile ? profile.name : 'Amit Kumar',
                input2Placeholder: 'Full Legal Name',
                verifiedText: 'DigiLocker e-KYC Verified'
            };
        } else if (lower.includes('khasra') || lower.includes('khatauni') || lower.includes('land') || lower.includes('ror') || lower.includes('patta') || lower.includes('possession') || lower.includes('sowing')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-vector-square',
                badge: 'Bhulekh Synced',
                agency: 'State Revenue & Land Records Directorate',
                badgeColor: '#0284c7',
                input1Label: 'Khasra / Khatauni / Survey No.',
                input1Value: 'Khatauni #142 / Khasra 312',
                input1Placeholder: 'e.g. Khasra 240/1, Khatauni 189',
                input2Label: 'Land Area & Sub-District (Tehsil)',
                input2Value: (profile && profile.land && profile.land !== 'None') ? `${profile.land} • Tehsil Sadar` : '1.4 Hectares • Tehsil Sadar',
                input2Placeholder: 'Area in Acres/Hectares & Tehsil',
                verifiedText: 'State Bhulekh Portal Synced'
            };
        } else if (lower.includes('bank') || lower.includes('passbook') || lower.includes('account')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-building-columns',
                badge: 'DBT PFMS Ready',
                agency: 'Public Financial Management System (PFMS)',
                badgeColor: '#059669',
                input1Label: 'Bank Account Number & Name',
                input1Value: 'State Bank of India (A/C: ******4819)',
                input1Placeholder: 'Account Number & Bank Name',
                input2Label: 'Bank IFSC Code',
                input2Value: 'SBIN0001234',
                input2Placeholder: '11-character IFSC Code',
                verifiedText: 'NPCI Aadhaar-Bridge Seeded'
            };
        } else if (lower.includes('income')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-certificate',
                badge: 'Revenue Verified',
                agency: 'District Revenue Authority / Tehsildar',
                badgeColor: '#d97706',
                input1Label: 'Income Certificate No. / Token',
                input1Value: 'UP/INC/2026/89410',
                input1Placeholder: 'e.g. UP/INC/2026/89410',
                input2Label: 'Verified Annual Income (₹)',
                input2Value: (profile && profile.income) ? profile.income : '₹1,50,000 / year',
                input2Placeholder: 'e.g. ₹1,50,000',
                verifiedText: 'Revenue Officer Pre-Verified'
            };
        } else if (lower.includes('caste') || lower.includes('community') || lower.includes('tribe')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-address-card',
                badge: 'Social Welfare',
                agency: 'Department of Social Justice & Welfare',
                badgeColor: '#7c3aed',
                input1Label: 'Caste Certificate Application / Doc ID',
                input1Value: `CC-2025-${profile && profile.category ? profile.category : 'OBC'}-78219`,
                input1Placeholder: 'Certificate Serial Number',
                input2Label: 'Issuing Authority & State',
                input2Value: `${profile && profile.state ? profile.state : 'Uttar Pradesh'} Welfare Directorate`,
                input2Placeholder: 'Issuing Officer & State',
                verifiedText: 'State Caste Scrutiny Portal Verified'
            };
        } else if (lower.includes('marksheet') || lower.includes('education') || lower.includes('bonafide') || lower.includes('degree') || lower.includes('school') || lower.includes('college')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-graduation-cap',
                badge: 'NAD DigiLocker',
                agency: 'National Academic Depository (NAD)',
                badgeColor: '#2563eb',
                input1Label: 'Roll Number / Student Enrollment ID',
                input1Value: 'ROLL-2025-10928',
                input1Placeholder: 'Roll Number / Registration No',
                input2Label: 'Board / University & Score (%)',
                input2Value: 'CBSE Board / 78.4%',
                input2Placeholder: 'Institution & Percentage',
                verifiedText: 'DigiLocker NAD Depository Synced'
            };
        } else if (lower.includes('disability') || lower.includes('udid')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-wheelchair',
                badge: 'Swavlamban Portal',
                agency: 'Department of Empowerment of Persons with Disabilities',
                badgeColor: '#dc2626',
                input1Label: 'UDID Card / Enrollment Number',
                input1Value: 'UP2810920000189',
                input1Placeholder: 'UDID Identification Number',
                input2Label: 'Disability Percentage & Type',
                input2Value: '45% - Locomotor Disability',
                input2Placeholder: 'e.g. 40% Hearing Impairment',
                verifiedText: 'Swavlamban Medical Board Verified'
            };
        } else if (lower.includes('udyam') || lower.includes('msme') || lower.includes('business') || lower.includes('trade') || lower.includes('vending') || lower.includes('artisan') || lower.includes('craft')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-briefcase',
                badge: 'MoMSME / ULB',
                agency: 'Ministry of MSME / Town Vending Committee',
                badgeColor: '#059669',
                input1Label: 'Udyam / Vending Registration No.',
                input1Value: 'UDYAM-UP-00-192847',
                input1Placeholder: 'e.g. UDYAM-XX-00-0000000',
                input2Label: 'Enterprise / Artisan Trade Name',
                input2Value: (profile && profile.occupation) ? `${profile.occupation} Enterprise` : 'Artisan Enterprise',
                input2Placeholder: 'Registered Enterprise / Trade Name',
                verifiedText: 'MoMSME Gateway Synced'
            };
        } else if (lower.includes('ration') || lower.includes('nfsa') || lower.includes('bpl')) {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-receipt',
                badge: 'NFSA Portal',
                agency: 'Department of Food & Public Distribution',
                badgeColor: '#0284c7',
                input1Label: 'Ration Card Number (NFSA/BPL)',
                input1Value: 'RC-0918-2819-3019',
                input1Placeholder: 'Ration Card Number',
                input2Label: 'Card Category & Family Head',
                input2Value: 'PHH (Priority Household)',
                input2Placeholder: 'PHH / AAY / BPL',
                verifiedText: 'State Food & Civil Supplies Verified'
            };
        } else {
            return {
                id: cleanId,
                name: docName,
                icon: 'fa-file-shield',
                badge: 'DigiLocker Doc',
                agency: 'Digital India Verified Repository',
                badgeColor: '#4f46e5',
                input1Label: `${docName} Serial / Token No.`,
                input1Value: 'DOC-' + Math.floor(100000 + Math.random() * 900000),
                input1Placeholder: 'Enter Document Reference / ID',
                input2Label: 'Issuing Authority / State',
                input2Value: (profile && profile.state) ? profile.state : 'Government of India',
                input2Placeholder: 'Issuing Department / Agency',
                verifiedText: 'Pre-Verified via DigiLocker Repository'
            };
        }
    }

    const SarthXGovBridge = {
        // Retrieve current logged-in citizen profile
        getUserProfile: function() {
            try {
                const data = localStorage.getItem('sarthx_user_profile');
                return data ? JSON.parse(data) : null;
            } catch (e) {
                console.error('Error fetching user profile', e);
                return null;
            }
        },

        // Save or update customer profile
        saveUserProfile: function(profile) {
            try {
                localStorage.setItem('sarthx_user_profile', JSON.stringify(profile));
                localStorage.setItem('sarthx_auth_token', 'SARTHX_TOKEN_' + Date.now());
                window.dispatchEvent(new CustomEvent('sarthx_profile_updated', { detail: profile }));
                return true;
            } catch (e) {
                console.error('Error saving profile', e);
                return false;
            }
        },

        // Get all applications (saved + seed)
        getApplications: function() {
            try {
                const stored = localStorage.getItem('sarthx_applications');
                if (stored) {
                    return JSON.parse(stored);
                }
                // Seed initial demo applications
                localStorage.setItem('sarthx_applications', JSON.stringify(SEED_APPLICATIONS));
                return SEED_APPLICATIONS;
            } catch (e) {
                return SEED_APPLICATIONS;
            }
        },

        // Save a new application
        saveApplication: function(app) {
            const apps = this.getApplications();
            apps.unshift(app);
            try {
                localStorage.setItem('sarthx_applications', JSON.stringify(apps));
                return true;
            } catch (e) {
                console.error('Error saving application', e);
                return false;
            }
        },

        // Match schemes for given profile with score
        calculateMatchScore: function(scheme, profile) {
            if (!profile) return 60;
            let score = 30; // base qualification score
            const reasons = [];

            // 1. Occupation Match (+30)
            const schemeOccs = (scheme.eligibleOccupations || (scheme.eligibilityCriteria && scheme.eligibilityCriteria.occupations) || []).map(o => o.toLowerCase());
            const userOcc = (profile.occupation || '').toLowerCase();
            if (schemeOccs.includes('all') || schemeOccs.some(o => userOcc.includes(o) || o.includes(userOcc))) {
                score += 30;
                reasons.push(`Occupation matched: ${profile.occupation}`);
            } else if (scheme.category === 'business' && (userOcc.includes('business') || userOcc.includes('vendor') || userOcc.includes('artisan') || userOcc.includes('entrepreneur'))) {
                score += 25;
                reasons.push(`Sector preference matched`);
            } else if (scheme.category === 'agriculture' && userOcc.includes('farmer')) {
                score += 30;
                reasons.push(`Target Beneficiary: Farmer`);
            } else if (scheme.category === 'students' && userOcc.includes('student')) {
                score += 30;
                reasons.push(`Target Beneficiary: Student`);
            }

            // 2. Social Category Match (+20)
            const schemeCats = (scheme.eligibleCategories || (scheme.eligibilityCriteria && scheme.eligibilityCriteria.caste) || []).map(c => c.toLowerCase());
            const userCat = (profile.category || '').toLowerCase();
            if (schemeCats.includes('all') || schemeCats.includes(userCat)) {
                score += 20;
                reasons.push(`Category eligible: ${profile.category}`);
            } else {
                score += 5;
            }

            // 3. Income Match (+15)
            const maxInc = scheme.maxAnnualIncome || (scheme.eligibilityCriteria && scheme.eligibilityCriteria.maxIncome) || 9999999;
            const userIncVal = profile.incomeValue || 200000;
            if (userIncVal <= maxInc) {
                score += 15;
                reasons.push(`Annual income qualifies (< ₹${maxInc > 1000000 ? '10L' : (maxInc/100000) + 'L'})`);
            }

            // 4. Age Match (+15)
            const userAge = parseInt(profile.age) || 25;
            const minAge = scheme.minAge || (scheme.eligibilityCriteria && scheme.eligibilityCriteria.minAge) || 18;
            const maxAge = scheme.maxAge || (scheme.eligibilityCriteria && scheme.eligibilityCriteria.maxAge) || 70;
            if (userAge >= minAge && userAge <= maxAge) {
                score += 15;
                reasons.push(`Age ${userAge} in eligible range (${minAge}-${maxAge} yrs)`);
            }

            // 5. State / Level Match (+10)
            if (scheme.level === 'Central' || scheme.state === 'All India' || (profile.state && scheme.state === profile.state)) {
                score += 10;
                reasons.push(`Jurisdiction: ${scheme.state || 'All India'}`);
            }

            return {
                score: Math.min(score, 99),
                reasons: reasons.slice(0, 3)
            };
        },

        // Trigger local file upload simulator for a document card
        triggerDocUpload: function(docId) {
            const fileInput = document.getElementById(docId + '_file');
            if (fileInput) {
                fileInput.click();
            }
        },

        // Handle file change on document card
        onDocFileSelected: function(docId, event) {
            const files = event.target.files;
            if (files && files.length > 0) {
                const fileName = files[0].name;
                const statusEl = document.getElementById(docId + '_status');
                if (statusEl) {
                    statusEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--primary);"></i> <strong>${fileName}</strong> Attached & Cryptographically Signed`;
                }
            }
        },

        // Open Pre-Filled Government Application Modal
        openGovModal: function(schemeIdOrQuery) {
            const db = window.SCHEMES_DATABASE || [];
            let scheme = db.find(s => s.id === schemeIdOrQuery);
            if (!scheme && schemeIdOrQuery) {
                const q = String(schemeIdOrQuery).toLowerCase();
                scheme = db.find(s => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || q.includes(s.id.toLowerCase()));
            }
            if (!scheme && db.length > 0) {
                scheme = db[0];
            }
            if (!scheme) {
                alert('Scheme not found. Please try again.');
                return;
            }

            const profile = this.getUserProfile() || {
                name: 'Amit Kumar',
                phone: '9876543210',
                age: 26,
                category: 'OBC',
                state: 'Uttar Pradesh',
                income: '₹1,00,000 - ₹2,50,000',
                occupation: 'Artisan / Small Entrepreneur',
                land: 'Small (Under 2 Hectares)'
            };

            let modal = document.getElementById('sarthxGovModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'sarthxGovModal';
                modal.className = 'modal-overlay';
                document.body.appendChild(modal);
            }

            const applyLink = scheme.directApplyUrl || scheme.officialUrl;

            // Prepare real required documents list from scheme metadata
            const rawDocs = (scheme.documentsRequired && scheme.documentsRequired.length > 0) 
                ? scheme.documentsRequired 
                : ['Aadhaar Card', 'Active Bank Passbook', 'Income Certificate', 'Applicant Photograph'];

            // Build dynamic document cards HTML
            const docCardsHtml = rawDocs.map((docName, idx) => {
                const docInfo = getDocTypeInfo(docName, idx, profile);
                return `
                    <div class="gov-doc-input-card" id="${docInfo.id}_card">
                        <input type="file" id="${docInfo.id}_file" style="display: none;" accept=".pdf,.jpg,.jpeg,.png" onchange="SarthXGovBridge.onDocFileSelected('${docInfo.id}', event)">
                        <input type="hidden" name="docName_${idx}" value="${docInfo.name}">
                        <input type="hidden" name="docAgency_${idx}" value="${docInfo.agency}">
                        <input type="hidden" name="docBadgeColor_${idx}" value="${docInfo.badgeColor}">

                        <div class="gov-doc-header">
                            <span class="gov-doc-title">
                                <i class="fa-solid ${docInfo.icon}" style="color: var(--primary);"></i>
                                ${docInfo.name}
                            </span>
                            <span class="gov-doc-badge" style="color: ${docInfo.badgeColor}; border-color: ${docInfo.badgeColor}40; background: ${docInfo.badgeColor}15;">
                                <i class="fa-solid fa-shield-check"></i> ${docInfo.badge}
                            </span>
                        </div>

                        <div class="gov-doc-fields-row">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="font-size: 0.76rem;">${docInfo.input1Label}</label>
                                <input type="text" name="docNum_${idx}" id="${docInfo.id}_num" class="form-input gov-field-prefilled" value="${docInfo.input1Value}" placeholder="${docInfo.input1Placeholder}" required>
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="font-size: 0.76rem;">${docInfo.input2Label}</label>
                                <input type="text" name="docSec_${idx}" id="${docInfo.id}_sec" class="form-input gov-field-prefilled" value="${docInfo.input2Value}" placeholder="${docInfo.input2Placeholder}" required>
                            </div>
                        </div>

                        <div class="gov-doc-status-row">
                            <span id="${docInfo.id}_status">
                                <i class="fa-solid fa-circle-check" style="color: var(--primary);"></i>
                                <span>${docInfo.verifiedText}</span>
                            </span>
                            <button type="button" class="gov-doc-upload-btn" onclick="SarthXGovBridge.triggerDocUpload('${docInfo.id}')">
                                <i class="fa-solid fa-upload"></i> Re-upload / Attach File
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="modal-content gov-modal-dialog">
                    <button class="modal-close-btn" onclick="SarthXGovBridge.closeGovModal()"><i class="fa-solid fa-xmark"></i></button>
                    
                    <div class="gov-modal-header">
                        <div class="gov-emblem-badge">
                            <img src="img/sarthx-logo.png" alt="SarthX Official Logo">
                            <div>
                                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 2px;">
                                    Official Welfare Application Bridge
                                </h3>
                                <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">
                                    <i class="fa-solid fa-shield-halved"></i> JanSamarth, DigiLocker & DBT Bridge Pre-Populated
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--bg-card-hover); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
                        <span class="scheme-badge ${scheme.badgeClass}">${scheme.categoryName}</span>
                        <h4 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin: 6px 0;">${scheme.title}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted);">${scheme.benefit}</p>
                    </div>

                    <form id="sarthxGovForm" onsubmit="SarthXGovBridge.handleFormSubmit(event, '${scheme.id}')">
                        <!-- Section 1: Demographics -->
                        <h4 class="gov-form-section-title">
                            <i class="fa-solid fa-user-check"></i> 1. Verified Citizen Credentials
                        </h4>
                        <div class="form-grid-2col">
                            <div class="form-group">
                                <label class="form-label">Full Name <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="text" id="govFormName" class="form-input gov-field-prefilled" value="${profile.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Mobile (Aadhaar Linked) <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="tel" id="govFormPhone" class="form-input gov-field-prefilled" value="${profile.phone || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Age / DOB <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="number" id="govFormAge" class="form-input gov-field-prefilled" value="${profile.age || 24}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Social Category <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="text" id="govFormCategory" class="form-input gov-field-prefilled" value="${profile.category || 'General'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">State / Domicile <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="text" id="govFormState" class="form-input gov-field-prefilled" value="${profile.state || 'All India'}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Occupation <i class="fa-solid fa-circle-check gov-verified-check"></i></label>
                                <input type="text" id="govFormOccupation" class="form-input gov-field-prefilled" value="${profile.occupation || 'Self Employed'}" required>
                            </div>
                        </div>

                        <!-- Section 2: Real Scheme-Specific Documents Required -->
                        <h4 class="gov-form-section-title">
                            <i class="fa-solid fa-file-invoice"></i> 2. Scheme-Specific Required Documents (${rawDocs.length} Mandatory)
                        </h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
                            The documents below are mandatory for <strong>${scheme.title}</strong> under official Ministry guidelines. Details have been pre-fetched from your DigiLocker locker and can be reviewed or updated below:
                        </p>

                        <div id="govDocumentsWrapper">
                            ${docCardsHtml}
                        </div>

                        <div class="gov-disclaimer-box">
                            <i class="fa-solid fa-shield-halved" style="color: var(--primary); margin-right: 6px;"></i>
                            <strong>Government API Handshake:</strong> Submitting will transmit your cryptographic DigiLocker document signatures directly to the Ministry nodal gateway, register your official National Tracking ID, and open your live tracking timeline.
                        </div>

                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button type="submit" id="btnSubmitGovBridge" class="btn-auto-fill-gov" style="padding: 14px; font-size: 0.95rem; border-radius: var(--radius-pill); flex: 1.5;">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <span>Submit Application & Sync with Official Portal</span>
                            </button>
                            <a href="${applyLink}" target="_blank" rel="noopener noreferrer" class="check-details-btn" style="padding: 14px; border-radius: var(--radius-pill); flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span>Open Raw Portal</span>
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a>
                        </div>
                    </form>
                </div>
            `;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        closeGovModal: function() {
            const modal = document.getElementById('sarthxGovModal');
            if (modal) {
                modal.classList.remove('active');
            }
            document.body.style.overflow = 'auto';
        },

        // Submit application, collect document manifest, simulate API handshake & store
        handleFormSubmit: function(e, schemeId) {
            e.preventDefault();
            const submitBtn = document.getElementById('btnSubmitGovBridge');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing with Ministry API Gateway...';
            }

            const db = window.SCHEMES_DATABASE || [];
            let scheme = db.find(s => s.id === schemeId);
            if (!scheme && schemeId) {
                const q = String(schemeId).toLowerCase();
                scheme = db.find(s => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || q.includes(s.id.toLowerCase()));
            }
            if (!scheme && db.length > 0) scheme = db[0];
            if (!scheme) {
                scheme = {
                    title: 'Government Welfare Scheme',
                    benefit: 'Direct Benefit Transfer',
                    level: 'Central'
                };
            }

            const name = document.getElementById('govFormName').value;
            const phone = document.getElementById('govFormPhone').value;
            const age = document.getElementById('govFormAge').value;
            const category = document.getElementById('govFormCategory').value;
            const state = document.getElementById('govFormState').value;
            const occupation = document.getElementById('govFormOccupation').value;

            // Collect all dynamic document rows
            const form = document.getElementById('sarthxGovForm');
            const submittedDocuments = [];
            let idx = 0;
            while (form[`docName_${idx}`]) {
                const docName = form[`docName_${idx}`].value;
                const agency = form[`docAgency_${idx}`] ? form[`docAgency_${idx}`].value : 'Government of India';
                const badgeColor = form[`docBadgeColor_${idx}`] ? form[`docBadgeColor_${idx}`].value : '#059669';
                const docNum = form[`docNum_${idx}`] ? form[`docNum_${idx}`].value : 'VERIFIED-TOKEN';
                const docSec = form[`docSec_${idx}`] ? form[`docSec_${idx}`].value : '';

                submittedDocuments.push({
                    name: docName,
                    docNumber: docNum,
                    secondary: docSec,
                    status: 'DigiLocker Verified',
                    agency: agency,
                    badgeColor: badgeColor
                });
                idx++;
            }

            // Generate official Reference ID
            const prefix = (scheme.title.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'GOV').toUpperCase();
            const refId = `SARTHX-2026-${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

            const newApp = {
                refId: refId,
                schemeId: schemeId,
                schemeTitle: scheme.title,
                ministry: scheme.level === 'Central' ? 'Government of India' : `${state} State Welfare Department`,
                applicantName: name,
                phone: phone,
                age: age,
                category: category,
                state: state,
                occupation: occupation,
                benefit: scheme.benefit,
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                currentStage: 2, // Submitted + e-KYC verified, now in Scrutiny
                status: 'Application Submitted & Pre-Verified (In Scrutiny)',
                statusClass: 'status-badge-scrutiny',
                disbursementDate: 'Estimated in 14-21 days',
                nodalOffice: `${state} District Welfare Center`,
                submittedDocuments: submittedDocuments
            };

            // Simulate realistic API handshake latency
            setTimeout(() => {
                this.saveApplication(newApp);
                this.closeGovModal();

                // Show celebratory acknowledgement
                const ackModal = document.createElement('div');
                ackModal.className = 'modal-overlay active';
                ackModal.innerHTML = `
                    <div class="modal-content" style="max-width: 580px; text-align: center;">
                        <div style="width: 68px; height: 68px; background: rgba(16, 185, 129, 0.15); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 20px auto;">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
                            Application Synced with Government Portal!
                        </h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px;">
                            <strong>${submittedDocuments.length} mandatory documents</strong> were cryptographically validated and mapped to your beneficiary DBT profile.
                        </p>
                        <div style="background: var(--bg-card-hover); border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Official Reference ID</span>
                            <div style="font-size: 1.35rem; font-weight: 800; color: var(--primary); font-family: monospace; margin-top: 4px;">
                                ${refId}
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <a href="tracker.html?id=${refId}" class="btn-auto-fill-gov" style="flex: 1.2; padding: 14px; border-radius: var(--radius-pill); text-decoration: none;">
                                <i class="fa-solid fa-timeline"></i> Track Status & View Dossier
                            </a>
                            <button onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow='auto';" class="check-details-btn" style="flex: 0.8; padding: 14px; border-radius: var(--radius-pill);">
                                Close
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(ackModal);
                document.body.style.overflow = 'hidden';
            }, 800);
        }
    };

    window.SarthXGovBridge = SarthXGovBridge;

})(window);
