export const calculateANP = (premiumPaid, modeOfPayment) => {
    const val = parseFloat(premiumPaid) || 0;
    let anp = 0;

    if (modeOfPayment === 'Monthly') anp = val * 12;
    else if (modeOfPayment === 'Quarterly') anp = val * 4;
    else if (modeOfPayment === 'Semi-Annual') anp = val * 2;
    else anp = val;

    return anp.toFixed(2);
};

export const calculateNextPaymentDate = (policyDate, modeOfPayment) => {
    const startDate = new Date(policyDate);
    const today = new Date();
    let nextDate = new Date(startDate);

    let monthsToAdd = 0;
    if (modeOfPayment === 'Monthly') monthsToAdd = 1;
    else if (modeOfPayment === 'Quarterly') monthsToAdd = 3;
    else if (modeOfPayment === 'Semi-Annual') monthsToAdd = 6;
    else if (modeOfPayment === 'Annual') monthsToAdd = 12;

    while (nextDate <= today && monthsToAdd > 0) {
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    }

    return nextDate;
};

export const getDaysUntilPayment = (nextPaymentDate) => {
    const today = new Date();
    const diffTime = new Date(nextPaymentDate) - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (amount) => {
    return 'PHP ' + parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
};

export const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
};
