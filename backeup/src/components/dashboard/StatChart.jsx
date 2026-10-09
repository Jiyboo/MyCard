import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register( CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler );

const StatChart = ({ type, title, labels, dataValue, themeColor }) => {
 const chartData = dataValue || [];

 const bgColors = [
  `rgba(${themeColor}, 0.8)`,
  'rgba(234, 179, 8, 0.8)',
  'rgba(239, 68, 68, 0.8)'
 ];

 const borderColors = [
  `rgb(${themeColor})`,
  'rgb(234, 179, 8)',
  'rgb(239, 68, 68)'
 ];

 const data = {
  labels: labels,
  datasets: [
   {
    label: title,
    data: chartData,
    backgroundColor: bgColors.slice(0, chartData.length),
    borderColor: borderColors.slice(0, chartData.length),
    borderWidth: 1,
    fill: true,
    tension: 0.4
   },
  ],
 };

 const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
   legend: {
    display: type === 'pie',
    position: 'bottom',
   }
  },
  scales: type === 'pie' ? {} : {
   y: {
    beginAtZero: true,
    ticks: {
     stepSize: 1
    },
    suggestedMax: Math.max(...(chartData.length > 0 ? chartData : [0])) < 5 ? 5 : undefined
   }
  }
 };

 const renderChart = () => {
  switch (type) {
   case 'line': return <Line data={data} options={options} />;
   case 'pie': return <Pie data={data} options={options} />;
   case 'bar':
   default: return <Bar data={data} options={options} />;
  }
 };

 return (
  <div className="w-full h-full min-h-[300px] relative">
   {renderChart()}
  </div>
 );
};

export default StatChart;