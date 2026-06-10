// Market Landscape Intelligence Frontend Application Code

// Global App Config State
let APP_NAME = "CompeteIntel";
let activeLoadingInterval = null;
//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.API_BASE_URL || "http://localhost:8000";
//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.API_BASE_URL || "https://competeintel-backend.onrender.com";
const API_BASE_URL =
  window.API_BASE_URL ||
  "https://competeintel-backend.onrender.com";
  
// On Page Load
window.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Load Brand Settings
    fetchBranding();
});

// Fetch brand settings from backend API
async function fetchBranding() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        if (response.ok) {
            const data = await response.json();
            if (data.app_name) {
                APP_NAME = data.app_name;
                updateBrandingUI();
            }
        }
    } catch (err) {
        console.warn("Could not fetch branding from API, using default name:", err);
    }
}

// Update application branding throughout the DOM
function updateBrandingUI() {
    document.querySelectorAll('.app-name').forEach(el => {
        el.textContent = APP_NAME;
    });
    
    const titles = document.querySelectorAll('.app-name-title');
    titles.forEach(el => {
        el.textContent = `${APP_NAME} - Competitive Intelligence`;
    });
}

// Toggle advanced context textbox visibility
function toggleExtraContext() {
    const wrapper = document.getElementById('context-wrapper');
    const toggleIcon = document.querySelector('.btn-toggle-context .toggle-icon');
    
    wrapper.classList.toggle('show');
    if (toggleIcon) {
        toggleIcon.classList.toggle('rotate');
    }
}

// Switch between page views
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.add('active');
    }
    
    // Reset page scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Tab navigation control
function switchTab(event, tabId) {
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Deactivate all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Activate target
    event.currentTarget.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Loading Status Simulation
function startLoadingSimulation() {
    const steps = [
        { id: 'step-scrape', duration: 8000 },   // stage 1
        { id: 'step-analyze', duration: 10000 },  // stage 2
        { id: 'step-discover', duration: 8000 },  // stage 3
        { id: 'step-enrich', duration: 12000 }    // stage 4
    ];

    let currentStepIndex = 0;
    const progressFill = document.getElementById('progress-fill');

    // Reset all steps to inactive
    steps.forEach(step => {
        const el = document.getElementById(step.id);
        if (el) {
            el.classList.remove('active', 'completed');
        }
    });

    // Set first step active
    const firstStep = document.getElementById(steps[0].id);
    if (firstStep) firstStep.classList.add('active');
    if (progressFill) progressFill.style.width = '12%';

    let totalElapsed = 0;
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    activeLoadingInterval = setInterval(() => {
        totalElapsed += 200;

        // Calculate progress percentage
        const progressPercent = Math.min((totalElapsed / totalDuration) * 90, 90);
        if (progressFill) progressFill.style.width = `${progressPercent}%`;

        // Check if we should transition to the next step
        let stepProgressSum = 0;
        for (let i = 0; i < steps.length; i++) {
            stepProgressSum += steps[i].duration;
            if (totalElapsed >= stepProgressSum && currentStepIndex === i) {
                // Complete current step
                const currentEl = document.getElementById(steps[i].id);
                if (currentEl) {
                    currentEl.classList.remove('active');
                    currentEl.classList.add('completed');
                }

                // Active next step if it exists
                if (i + 1 < steps.length) {
                    currentStepIndex = i + 1;
                    const nextEl = document.getElementById(steps[i + 1].id);
                    if (nextEl) nextEl.classList.add('active');
                }
            }
        }
    }, 200);
}

// Complete loading visualization instantly
function finishLoadingSimulation(success = true) {
    if (activeLoadingInterval) {
        clearInterval(activeLoadingInterval);
        activeLoadingInterval = null;
    }
    
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = '100%';
    }
    
    const stepIds = ['step-scrape', 'step-analyze', 'step-discover', 'step-enrich'];
    stepIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            if (success) {
                el.classList.add('completed');
            }
        }
    });
}

// Main Form Submit handler
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const product_name = document.getElementById('product_name').value;
    const company_name = document.getElementById('company_name').value;
    const website_url = document.getElementById('website_url').value;
    const competitor_region = document.getElementById('competitor_region').value;
    const extra_context = document.getElementById('extra_context').value;
    
    // Switch to loading screen
    showView('loading-view');
    startLoadingSimulation();
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_name,
                company_name: company_name.trim() ? company_name : null,
                website_url,
                competitor_region,
                extra_context: extra_context.trim() ? extra_context : null
            })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Analysis request failed.');
        }
        
        const data = await response.json();
        
        // Fast-forward animation & render
        finishLoadingSimulation(true);
        setTimeout(() => {
            renderReport(data);
            showView('report-view');
        }, 800);
        
    } catch (error) {
        console.error("Analysis Failed:", error);
        finishLoadingSimulation(false);
        alert(`Error compiling competitive intelligence: ${error.message}\nPlease check your network connection, ensure the website URL is accessible, and verify that your OpenAI API Key is valid.`);
        showView('home-view');
    }
}

// Format values for Price presentation
function formatPrice(price, currency = '$') {
    if (price === null || price === undefined) return '';
    return `${currency}${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// // Dynamically Render Output Report Dashboard
function renderReport(data) {
    // Cache the analysis result globally
    window.lastAnalysisResult = data;
    window.competitorDetailsCache = {};

    // 1. Set Metadata Header details
    document.getElementById('out-product-name').textContent = data.product_name || '-';
    
    const linkEl = document.getElementById('out-website-url');
    linkEl.textContent = data.website_url;
    linkEl.href = data.website_url;
    
    document.getElementById('out-competitor-region').textContent = data.competitor_region || '-';
    
    // 2. Set Profile Overview Tab
    const analysis = data.analysis || {};
    document.getElementById('out-val-prop').textContent = analysis.value_proposition || 'No value proposition extracted.';
    document.getElementById('out-strat-positioning').textContent = analysis.strategic_positioning || 'No positioning defined.';
    document.getElementById('out-category').textContent = analysis.category || 'General';
    
    const confidenceBadge = document.getElementById('out-confidence');
    confidenceBadge.textContent = analysis.confidence || 'Medium';
    // Style confidence color
    const ring = confidenceBadge.closest('.gauge-ring');
    if (ring) {
        ring.style.boxShadow = 'none';
        if (analysis.confidence?.toLowerCase() === 'high') {
            ring.style.borderTopColor = 'var(--accent)';
            ring.style.borderRightColor = 'var(--accent)';
            ring.style.boxShadow = '0 0 20px var(--accent-glow)';
            confidenceBadge.style.color = 'var(--accent)';
        } else if (analysis.confidence?.toLowerCase() === 'low') {
            ring.style.borderTopColor = 'var(--accent-danger)';
            ring.style.borderRightColor = 'var(--border-color)';
            ring.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.1)';
            confidenceBadge.style.color = 'var(--accent-danger)';
        } else {
            ring.style.borderTopColor = 'var(--accent-warning)';
            ring.style.borderRightColor = 'var(--accent-warning)';
            ring.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.1)';
            confidenceBadge.style.color = 'var(--accent-warning)';
        }
    }
    
    // Populate list items helpers
    populateList('list-core-features', analysis.core_features);
    populateList('list-target-users', analysis.target_users);
    
    // Scraping Stats
    const scraped = data.scraped_data || {};
    document.getElementById('out-scrape-title').textContent = scraped.title || 'Untitled Web Page';
    document.getElementById('out-scrape-length').textContent = scraped.text ? scraped.text.length.toLocaleString() : '0';
    
    // 3. Set Discovered Competitors list in Sidebar
    const discovery = data.competitor_discovery || {};
    const competitors = discovery.discovered_competitors || [];
    document.getElementById('count-competitors').textContent = competitors.length;
    
    const competitorsContainer = document.getElementById('competitors-list');
    competitorsContainer.innerHTML = '';
    
    // Reset right detailed pane
    document.getElementById('competitor-detail-placeholder').classList.remove('hidden');
    document.getElementById('competitor-detail-loading').classList.add('hidden');
    document.getElementById('competitor-detail-content').classList.add('hidden');

    if (competitors.length === 0) {
        competitorsContainer.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
                <p>No competitors found in discovery.</p>
            </div>
        `;
    } else {
        competitors.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'competitor-sidebar-card animate-slide-up';
            
            // Confidence badge styling
            let confClass = 'badge-warning';
            const confLower = comp.confidence?.toLowerCase();
            if (confLower === 'high') confClass = 'badge-success';
            if (confLower === 'low') confClass = 'badge-danger';
            
            const siteLabel = comp.website ? comp.website.replace(/^https?:\/\/(www\.)?/, '') : 'Website unknown';
            
            card.innerHTML = `
                <div class="sidebar-card-header">
                    <h4>${comp.name}</h4>
                    <span class="badge ${confClass}">Conf: ${comp.confidence || 'Medium'}</span>
                </div>
                <div class="sidebar-card-website"><i data-feather="globe" style="width:12px; height:12px; margin-right:4px;"></i> ${siteLabel}</div>
                <p class="sidebar-card-reason">${comp.reason || 'Discovered competitor archetype.'}</p>
            `;
            
            // Set click handler
            card.addEventListener('click', () => selectCompetitor(card, comp.name));
            competitorsContainer.appendChild(card);
        });
    }
    
    // 4. Strategic Insights Tab
    const insightsResult = data.market_insights || {};
    document.getElementById('out-exec-summary').textContent = insightsResult.executive_summary || 'Strategic overview pending.';
    
    populateList('list-swot-s', insightsResult.strengths);
    populateList('list-swot-w', insightsResult.weaknesses);
    populateList('list-swot-o', insightsResult.opportunities);
    populateList('list-swot-t', insightsResult.threats);
    
    populateList('list-differentiators', insightsResult.key_differentiators);
    populateList('list-market-gaps', insightsResult.market_gaps);
    populateList('list-customer-overlaps', insightsResult.target_customer_overlap);
    
    // Recommended next steps (ordered list)
    const nextStepsList = document.getElementById('list-next-steps');
    nextStepsList.innerHTML = '';
    const steps = insightsResult.recommended_next_steps || [];
    if (steps.length === 0) {
        nextStepsList.innerHTML = '<li>Deploy additional features</li><li>Review competitor enrichment results</li>';
    } else {
        steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            nextStepsList.appendChild(li);
        });
    }
    
    // Re-trigger feather icon drawings
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Handle Competitor selection in Sidebar
async function selectCompetitor(cardElement, competitorName) {
    // 1. Set active style in sidebar
    document.querySelectorAll('.competitor-sidebar-card').forEach(card => {
        card.classList.remove('active');
    });
    cardElement.classList.add('active');

    // 2. Clear state and show Loader if not cached
    const cache = window.competitorDetailsCache || {};
    if (cache[competitorName]) {
        renderCompetitorDetails(cache[competitorName]);
        return;
    }

    document.getElementById('competitor-detail-placeholder').classList.add('hidden');
    document.getElementById('competitor-detail-content').classList.add('hidden');
    document.getElementById('competitor-detail-loading').classList.remove('hidden');

    try {
        const activeComp = window.lastAnalysisResult.competitor_discovery.discovered_competitors.find(c => c.name === competitorName);
        if (!activeComp) throw new Error('Competitor details missing from discovery list.');

        // 3. Post payload to enrich endpoint
        const response = await fetch(`${API_BASE_URL}/api/enrich-competitor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_name: window.lastAnalysisResult.product_name,
                competitor_region: window.lastAnalysisResult.competitor_region,
                product_analysis: window.lastAnalysisResult.analysis,
                competitor: activeComp,
                target_website_text: window.lastAnalysisResult.scraped_data.text || "",
                extra_context: document.getElementById('extra_context').value || null
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Enrichment failed.');
        }

        const data = await response.json();

        // 4. Cache and Render
        window.competitorDetailsCache[competitorName] = data;
        renderCompetitorDetails(data);

    } catch (error) {
        console.error("Enrichment Failed:", error);
        alert(`Failed to load competitor intelligence: ${error.message}`);

        // Return to placeholder state
        document.getElementById('competitor-detail-placeholder').classList.remove('hidden');
        document.getElementById('competitor-detail-loading').classList.add('hidden');
        document.getElementById('competitor-detail-content').classList.add('hidden');
    }
}

// Render the loaded Competitor detail pane on the right
function renderCompetitorDetails(data) {
    const comp = data.enriched_competitor;
    const content = document.getElementById('competitor-detail-content');

    // Website url
    const websiteUrl = comp.website ? (comp.website.startsWith('http') ? comp.website : `https://${comp.website}`) : null;
    const siteLabel = comp.website ? comp.website.replace(/^https?:\/\/(www\.)?/, '') : 'Website unknown';

    // Relevance styling
    let relevanceClass = 'badge-primary';
    const relevanceLower = comp.relevance_to_target?.toLowerCase();
    if (relevanceLower === 'high') relevanceClass = 'badge-success';
    if (relevanceLower === 'medium') relevanceClass = 'badge-warning';
    if (relevanceLower === 'low') relevanceClass = 'badge-danger';

    const listHtml = (items) => {
        if (!items || items.length === 0) {
            return '<span class="text-muted" style="font-size:0.9rem;">None</span>';
        }
        return items.map(item => `<span class="pill" style="margin: 2px;">${item}</span>`).join('');
    };

    content.innerHTML = `
        <div class="detail-header">
            <div class="comp-title-group">
                <h2>${comp.name}</h2>
                ${websiteUrl ? 
                    `<a href="${websiteUrl}" target="_blank" class="comp-website"><i data-feather="external-link"></i> ${siteLabel}</a>` : 
                    `<span class="comp-website"><i data-feather="slash"></i> ${siteLabel}</span>`
                }
            </div>
            <span class="badge ${relevanceClass}" style="font-size:0.9rem; padding: 0.4rem 0.8rem;">Relevance: ${comp.relevance_to_target || 'Medium'}</span>
        </div>

        <div class="detail-section" style="margin-top: 1rem;">
            <div class="comp-category" style="font-size:1rem; color:var(--accent); font-weight:600; margin-bottom:0.5rem; text-transform: uppercase; letter-spacing:0.5px;">${comp.category || 'Competitor'}</div>
            <p class="comp-summary" style="font-size:0.95rem; line-height:1.6; color:var(--text-light); margin-bottom:1.25rem;">${comp.competitor_summary || 'No overview provided.'}</p>
            <div class="pill" style="display:inline-flex; margin-bottom:0.5rem; background: rgba(255,255,255,0.08);">Pricing intelligence available later</div>
        </div>

        <div class="dashboard-grid" style="gap: 1rem;">
            <div class="panel-card col-6 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="box" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Products & Services</h4>
                <div>${listHtml(comp.products_services)}</div>
            </div>

            <div class="panel-card col-6 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="users" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Target Customers</h4>
                <div>${listHtml(comp.target_customers)}</div>
            </div>

            <div class="panel-card col-6 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="trending-up" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Strengths</h4>
                <div>${listHtml(comp.strengths)}</div>
            </div>

            <div class="panel-card col-6 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="trending-down" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Weaknesses</h4>
                <div>${listHtml(comp.weaknesses)}</div>
            </div>

            <div class="panel-card col-12 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="target" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Positioning</h4>
                <p style="color:var(--text-light); line-height:1.6; margin-bottom:0;">${comp.positioning || 'No positioning data available.'}</p>
            </div>

            <div class="panel-card col-12 glass-card no-box-shadow" style="padding: 1.25rem; background: rgba(255,255,255,0.01);">
                <h4 style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;"><i data-feather="file-text" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Notes</h4>
                <div>${listHtml(comp.notes)}</div>
            </div>
        </div>
    `;

    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Unhide content
    document.getElementById('competitor-detail-placeholder').classList.add('hidden');
    document.getElementById('competitor-detail-loading').classList.add('hidden');
    content.classList.remove('hidden');
}

function populateList(elementId, items) {
    const listElement = document.getElementById(elementId);
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    if (!items || items.length === 0) {
        listElement.innerHTML = `<li style="color: var(--text-dark);">Data unavailable.</li>`;
        return;
    }
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        listElement.appendChild(li);
    });
}

// Print / Export Report function
function printReport() {
    window.print();
}
