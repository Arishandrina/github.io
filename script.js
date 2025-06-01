document.addEventListener('DOMContentLoaded', () => {
    const maturitySelect = document.getElementById('maturity');
    const securityTypeSelect = document.getElementById('security-type');
    const plotButton = document.getElementById('plot-button');
    const ctx = document.getElementById('ftpChart').getContext('2d');

    let ftpChart;

    // KBD Yield Data (Безрисковая ставка)
    const kbdYieldData = [
        { term: 0.25, yield: 20.07 }, { term: 0.50, yield: 19.02 },
        { term: 0.75, yield: 18.24 }, { term: 1.00, yield: 17.65},
        { term: 2.00, yield: 16.43 }, { term: 3.00, yield: 16.00 },
        { term: 5.00, yield: 15.77 }, { term: 7.00, yield: 15.73 },
        { term: 10.00, yield: 15.71 }, { term: 15.00, yield: 15.64 },
        { term: 20.00, yield: 15.59 }, { term: 30.00, yield: 15.56 }
    ];
    kbdYieldData.sort((a, b) => a.term - b.term);

    // Credit Spread Data (based on term)
    const creditSpreadTermData = [
        { term: 0.25, spread: 1.15 }, { term: 0.50, spread: 2.04 },
        { term: 0.75, spread: 3.27 }, { term: 1.00, spread: 3.42 },
        { term: 2.00, spread: 2.42 }, { term: 3.00, spread: 3.14 },
        { term: 5.00, spread: 3.16 }, { term: 7.00, spread: 3.36 },
        { term: 10.00, spread: 3.32 }, { term: 15.00, spread: 3.85 },
        { term: 20.00, spread: 4.06 }, { term: 30.00, spread: 3.35 }
    ];
    creditSpreadTermData.sort((a, b) => a.term - b.term);

    const securityTypeDiscounts = {
        'subfed_municipal_A_minus': 0.15,
        'veb_domrf': 0.15,
        'icb_domrf_guarantee': 0.20,
        'corp_A_minus': 0.20,
        'subfed_municipal_BBB': 0.30,
        'corp_BBB': 0.30
    };

    function interpolateValueFromTermData(targetTerm, termDataArray, valueKey) {
        if (termDataArray.length === 0) return null;
        if (targetTerm <= termDataArray[0].term) return termDataArray[0][valueKey];
        if (targetTerm >= termDataArray[termDataArray.length - 1].term) return termDataArray[termDataArray.length - 1][valueKey];

        let lowerBound = null, upperBound = null;
        for (let i = 0; i < termDataArray.length; i++) {
            if (termDataArray[i].term === targetTerm) return termDataArray[i][valueKey];
            if (termDataArray[i].term < targetTerm) {
                lowerBound = termDataArray[i];
            }
            if (termDataArray[i].term > targetTerm && lowerBound) {
                upperBound = termDataArray[i];
                break;
            }
        }
        if (lowerBound && upperBound) {
            const x1 = lowerBound.term, y1 = lowerBound[valueKey];
            const x2 = upperBound.term, y2 = upperBound[valueKey];
            return y1 + (targetTerm - x1) * (y2 - y1) / (x2 - x1);
        }
        return null;
    }

    function generateChartData() {
        const selectedMaxTerm = parseFloat(maturitySelect.value);
        const selectedSecurityType = securityTypeSelect.value;
        const discountRate = securityTypeDiscounts[selectedSecurityType] || 0;

        const labels = [];
        const baseYieldDataPoints = [];
        const creditSpreadMagnitudePoints = [];
        const liquidityPremiumMagnitudePoints = [];

        let termsToPlot = new Set();

        kbdYieldData.forEach(point => {
            if (point.term <= selectedMaxTerm) termsToPlot.add(point.term);
        });
        creditSpreadTermData.forEach(point => {
            if (point.term <= selectedMaxTerm) termsToPlot.add(point.term);
        });

        Array.from(maturitySelect.options).forEach(option => {
            const termValue = parseFloat(option.value);
            if (termValue <= selectedMaxTerm) {
                termsToPlot.add(termValue);
            }
        });
        termsToPlot.add(selectedMaxTerm);
        
        const sortedTerms = Array.from(termsToPlot).sort((a, b) => a - b);

        sortedTerms.forEach(term => {
            let baseYield = interpolateValueFromTermData(term, kbdYieldData, 'yield');
            let creditSpreadForTerm = interpolateValueFromTermData(term, creditSpreadTermData, 'spread');

            if (baseYield !== null && creditSpreadForTerm !== null) {
                labels.push(`${term}г`);
                baseYieldDataPoints.push(parseFloat(baseYield.toFixed(2)));
                creditSpreadMagnitudePoints.push(parseFloat(creditSpreadForTerm.toFixed(2)));
                const currentLiquidityRiskPremium = discountRate * creditSpreadForTerm;
                liquidityPremiumMagnitudePoints.push(parseFloat(currentLiquidityRiskPremium.toFixed(2)));
            }
        });
        
        const colorBase = 'rgba(255, 150, 150';
        const colorCreditSpread = 'rgba(255, 180, 180';
        const colorLiquidity = 'rgba(255, 210, 210';

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Безриск (КБД)',
                    data: baseYieldDataPoints,
                    borderColor: `${colorBase}, 1)`,
                    backgroundColor: `${colorBase}, 0.6)`,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 3,
                },
                {
                    label: 'Кредитный спред',
                    data: creditSpreadMagnitudePoints,
                    borderColor: `${colorCreditSpread}, 1)`,
                    backgroundColor: `${colorCreditSpread}, 0.6)`,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 3,
                },
                {
                    label: 'Премия за риск ликвидности',
                    data: liquidityPremiumMagnitudePoints,
                    borderColor: `${colorLiquidity}, 1)`,
                    backgroundColor: `${colorLiquidity}, 0.6)`,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 3,
                }
            ]
        };
    }

    function plotChart() {
        const chartData = generateChartData();
        if (ftpChart) {
            ftpChart.destroy();
        }
        ftpChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false, },
                scales: {
                    y: {
                        stacked: true,
                        min: 10,
                        title: { display: true, text: 'Доходность (%)', color: '#495057' },
                        ticks: { color: '#495057', callback: function(value) { return value.toFixed(1) + '%'; } },
                        grid: { color: 'rgba(0, 0, 0, 0.08)', borderColor: 'rgba(0, 0, 0, 0.08)' }
                    },
                    x: {
                        title: { display: true, text: 'Срочность (лет)', color: '#495057' },
                        ticks: { color: '#495057' },
                        grid: { color: 'rgba(0, 0, 0, 0.08)', borderColor: 'rgba(0, 0, 0, 0.08)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#212529' },
                        reverse: true
                    },
                    tooltip: {
                        backgroundColor: '#212529', titleColor: '#FFFFFF', bodyColor: '#F8F9FA',
                        borderColor: '#343A40', borderWidth: 1,
                        callbacks: {
                            title: function(tooltipItems) { return `Срочность: ${tooltipItems[0].label}`; },
                            label: function(context) {
                                const value = context.parsed.y;
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (value !== null) { label += value.toFixed(2) + '%'; }
                                return label;
                            },
                            footer: function(tooltipItems) {
                                let sum = 0;
                                for (const dataset of tooltipItems[0].chart.data.datasets) {
                                   sum += dataset.data[tooltipItems[0].dataIndex];
                                }
                                return 'Итого FTP: ' + sum.toFixed(2) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    plotButton.addEventListener('click', plotChart);
    plotChart(); // Первоначальная отрисовка графика при загрузке страницы

    const accordionItems = document.querySelectorAll('.risk-item');
    accordionItems.forEach(item => {
        const summary = item.querySelector('summary');
        summary.addEventListener('click', (event) => {
            // CSS transitions handle the animation
        });
    });

    // --- КОД ДЛЯ КОРРЕКТНОЙ РАБОТЫ ТУЛТИПА НА МОБИЛЬНЫХ ---
    function hideActiveChartTooltip() {
        if (ftpChart && ftpChart.tooltip && ftpChart.getActiveElements().length > 0) {
            ftpChart.tooltip.setActiveElements([], { x: 0, y: 0 });
            ftpChart.update('none'); 
        }
    }

    window.addEventListener('scroll', hideActiveChartTooltip, true); 

    document.addEventListener('click', function(event) {
        if (ftpChart && ftpChart.canvas) {
            const canvas = ftpChart.canvas;
            const isClickInsideCanvas = canvas.contains(event.target);
            
            if (!isClickInsideCanvas && ftpChart.getActiveElements().length > 0) {
                hideActiveChartTooltip();
            }
        }
    }, true); 
    // --- КОНЕЦ КОДА ДЛЯ КОРРЕКТНОЙ РАБОТЫ ТУЛТИПА НА МОБИЛЬНЫХ ---

});
