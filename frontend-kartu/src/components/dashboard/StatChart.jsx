import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { getChartConfig } from '../../utils/dashboardHelpers';

ChartJS.register( CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler );

const StatChart = ({ type, title, labels, dataValue, themeColor }) => {
  const { data, options } = getChartConfig(type, title, labels, dataValue, themeColor);

  const renderChart = () => {
    switch (type) {
      case 'line': return <Line data={data} options={options} />;
      case 'pie': return <Pie data={data} options={options} />;
      case 'bar':
      default: return <Bar data={data} options={options} />;
    }
  };

  return (
    <div className="w-full h-full relative">
      {renderChart()}
    </div>
  );
};

export default StatChart;