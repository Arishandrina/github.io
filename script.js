document.addEventListener('DOMContentLoaded', () => {
    const maturitySelect = document.getElementById('maturity');
    const securityTypeSelect = document.getElementById('security-type');
    const riskPremiumInput = document.getElementById('risk-premium');
    const plotButton = document.getElementById('plot-button');
    const ctx = document.getElementById('ftpChart').getContext('2d');

    let ftpChart;

    const kbdYieldData = [
        { term: 0.25, yield: 20.54 }, { term: 0.50, yield: 19.66 },
        { term: 0.75, yield: 18.95 }, { term: 1.00, yield: 18.36 },
        { term: 2.00, yield: 16.86 }, { term: 3.00, yield: 16.18 },
        { term: 5.00, yield: 15.78 }, { term: 7.00, yield: 15.75 },
        { term: 10.00, yield: 15.77 }, { term: 15.00, yield: 15.75 },
        { term: 20.00, yield: 15.73 }, { term: 30.00, yield: 15.73 }
    ];
    kbdYieldData.sort((a, b) => a.term - b.term);

    function interpolateYield(targetTerm) {
        if (kbdYieldData.length === 0) return null;
        if (targetTerm <= kbdYieldData[0].term) return kbdYieldData[0].yield;
        if (targetTerm >= kbdYieldData[kbdYieldData.length - 1].term) return kbdYieldData[kbdYieldData.length - 1].yield;
        let lowerBound = null, upperBound = null;
        for (let i = 0; i < kbdYieldData.length; i++) {
            if (kbdYieldData[i].term === targetTerm) return kbdYieldData[i].yield;
            if (kbdYieldData[i].term < targetTerm) lowerBound = kbdYieldData[i];
            if (kbdYieldData[i].term > targetTerm && lowerBound) {
                upperBound = kbdYieldData[i]; break;
            }
        }
        if (lowerBound && upperBound) {
            const x1 = lowerBound.term, y1 = lowerBound.yield, x2 = upperBound.term, y2 = upperBound.yield;
            return y1 + (targetTerm - x1) * (y2 - y1) / (x2 - x1);
        }
        return null;
    }

    function generateChartData() {
        const selectedMaxTerm = parseInt(maturitySelect.value);
        const selectedSecurityType = securityTypeSelect.value;
        const liquidityRiskPremiumValue = parseFloat(riskPremiumInput.value) || 0;

        let fixedCreditSpreadValue = 0;
        if (selectedSecurityType === 'ofz') fixedCreditSpreadValue = 0.1;
        else if (selectedSecurityType === 'domrf') fixedCreditSpreadValue = 3.75; // Используем ваши новые значения
        else if (selectedSecurityType === 'corporate') fixedCreditSpreadValue = 4.25; // Используем ваши новые значения

        const labels = [];
        const baseYieldDataPoints = [];
        const creditSpreadMagnitudePoints = [];
        const liquidityPremiumMagnitudePoints = [];

        let termsToPlot = new Set();
        let initialYieldForZero = interpolateYield(0);
        if (initialYieldForZero === null && kbdYieldData.length > 0) {
            initialYieldForZero = kbdYieldData[0].yield;
        }
        if (initialYieldForZero !== null) termsToPlot.add(0);

        kbdYieldData.forEach(point => {
            if (point.term <= selectedMaxTerm) termsToPlot.add(point.term);
        });
        Array.from(maturitySelect.options).forEach(option => {
            const termValue = parseInt(option.value);
            if (termValue <= selectedMaxTerm) termsToPlot.add(termValue);
        });
        termsToPlot.add(selectedMaxTerm);
        const sortedTerms = Array.from(termsToPlot).sort((a, b) => a - b);

        sortedTerms.forEach(term => {
            if (term === 0 && labels.includes("0г")) return;
            let baseYield = interpolateYield(term);
            if (baseYield !== null) {
                labels.push(term === 0 ? "0г" : `${term}г`);
                baseYieldDataPoints.push(parseFloat(baseYield.toFixed(2)));
                creditSpreadMagnitudePoints.push(parseFloat(fixedCreditSpreadValue.toFixed(2)));
                liquidityPremiumMagnitudePoints.push(parseFloat(liquidityRiskPremiumValue.toFixed(2)));
            }
        });
        
        if (labels.length === 0 && selectedMaxTerm === 0) {
            let yieldForZero = interpolateYield(0);
            if (yieldForZero === null && kbdYieldData.length > 0) yieldForZero = kbdYieldData[0].yield;
            if (yieldForZero !== null) {
                labels.push("Тек.");
                baseYieldDataPoints.push(parseFloat(yieldForZero.toFixed(2)));
                creditSpreadMagnitudePoints.push(parseFloat(fixedCreditSpreadValue.toFixed(2)));
                liquidityPremiumMagnitudePoints.push(parseFloat(liquidityRiskPremiumValue.toFixed(2)));
            }
        }

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
                        beginAtZero: true,
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
                                for (const chart of tooltipItems[0].chart.data.datasets) {
                                   sum += chart.data[tooltipItems[0].dataIndex];
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
    maturitySelect.addEventListener('change', plotChart);
    securityTypeSelect.addEventListener('change', plotChart);
    riskPremiumInput.addEventListener('change', plotChart);
    plotChart();

    // --- Код для плавной анимации аккордеона ---
    const accordionItems = document.querySelectorAll('.risk-item');

    accordionItems.forEach(item => {
        const summary = item.querySelector('summary');
        const content = item.querySelector('.risk-description');

        summary.addEventListener('click', (event) => {
            // Стандартное поведение <details> само переключает атрибут [open]
            // и CSS transition, основанный на этом атрибуте, должен сработать.
            // Дополнительный JS для анимации высоты здесь может быть избыточен
            // или конфликтовать с CSS-переходом для max-height.
            // Проверим, работает ли чисто CSS-ный вариант.

            // Если вам нужна более сложная анимация, не основанная только на max-height,
            // тогда event.preventDefault() и JS-анимация будут нужны.
            // Например, для анимации через requestAnimationFrame:

            // if (item.open) { // Если details собирается закрыться (после клика)
            //     event.preventDefault(); // Предотвращаем мгновенное закрытие
            //     content.style.maxHeight = content.scrollHeight + 'px'; // Устанавливаем текущую высоту
            //     requestAnimationFrame(() => { // В следующем кадре начинаем анимацию к нулю
            //         content.style.maxHeight = '0px';
            //         content.style.paddingTop = '0px';
            //         content.style.paddingBottom = '0px';
            //         content.style.opacity = '0';
            //     });
            //     content.addEventListener('transitionend', () => {
            //         item.removeAttribute('open'); // Убираем атрибут open после анимации
            //         content.style.maxHeight = null; // Сбрасываем стили
            //         content.style.paddingTop = null;
            //         content.style.paddingBottom = null;
            //         content.style.opacity = null;
            //     }, { once: true });
            // } else { // Если details собирается открыться
            //     // Стандартное поведение откроет и CSS transition сработает
            //     // Можно добавить класс для блокировки, если анимация долгая
            // }
        });
    });
});