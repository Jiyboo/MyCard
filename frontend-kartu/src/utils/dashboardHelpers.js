export const regions = ["Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Bali"];

export const chartModels = [
  { id: 'bar', name: 'Batang' },
  { id: 'line', name: 'Garis' },
  { id: 'pie', name: 'Donat' }
];

const mockDatabase = {
  global: {
    users: { aktif: 800, pending: 448 },
    cards: { aktif: 700, tidakAktif: 286 },
    regionalAdmins: 12
  },
  regions: {
    "Jakarta": { users: { aktif: 200, pending: 50 }, cards: { aktif: 180, tidakAktif: 70 } },
    "Jawa Barat": { users: { aktif: 150, pending: 100 }, cards: { aktif: 120, tidakAktif: 130 } },
    "Jawa Tengah": { users: { aktif: 150, pending: 100 }, cards: { aktif: 140, tidakAktif: 110 } },
    "Jawa Timur": { users: { aktif: 200, pending: 100 }, cards: { aktif: 180, tidakAktif: 120 } },
    "Bali": { users: { aktif: 100, pending: 98 }, cards: { aktif: 80, tidakAktif: 118 } },
  }
};

export const getDashboardData = (role, regionFilter) => {
  if (role === 'user') return null;

  if (role === 'admin_regional') {
    const adminRegion = "Jawa Barat"; 
    const data = mockDatabase.regions[adminRegion];
    return {
      regionName: adminRegion,
      totalUsers: data.users.aktif + data.users.pending,
      totalCards: data.cards.aktif + data.cards.tidakAktif,
      users: data.users,
      cards: data.cards,
      regionalAdmins: null
    };
  }

  if (role === 'superadmin') {
    if (regionFilter === 'global') {
      const data = mockDatabase.global;
      return {
        regionName: "Seluruh Indonesia",
        totalUsers: data.users.aktif + data.users.pending,
        totalCards: data.cards.aktif + data.cards.tidakAktif,
        users: data.users,
        cards: data.cards,
        regionalAdmins: data.regionalAdmins
      };
    } else {
      const data = mockDatabase.regions[regionFilter];
      if (!data) return null;
      return {
        regionName: regionFilter,
        totalUsers: data.users.aktif + data.users.pending,
        totalCards: data.cards.aktif + data.cards.tidakAktif,
        users: data.users,
        cards: data.cards,
        regionalAdmins: null
      };
    }
  }
  return null;
};

export const getChartConfig = (type, title, labels, dataValue, themeColor) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
  const gridColor = isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)';

  const baseData = {
    labels: labels,
    datasets: [{
      label: title,
      data: dataValue,
      backgroundColor: type === 'pie' 
        ? [`rgb(${themeColor})`, gridColor] 
        : `rgba(${themeColor}, 0.8)`,
      borderColor: `rgb(${themeColor})`,
      borderWidth: 1,
      fill: type === 'line',
      tension: 0.4,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'pie',
        position: 'bottom',
        labels: { color: textColor, font: { family: 'Inter', size: 12 } }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        font: { family: 'Inter' }
      }
    },
    scales: type === 'pie' ? {} : {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter' } },
        beginAtZero: true
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Inter' } }
      }
    }
  };

  return { data: baseData, options };
};