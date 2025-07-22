import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';

export default function MeatOrderGrid() {
  // Locked usage factors
  const usageLarge = 0.64;
  const usageSmall = 0.15;

  const [deliveryDate, setDeliveryDate] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [rows, setRows] = useState([]);

  // Today's date string for input min
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Generate date rows from today through delivery+duration
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!deliveryDate || !durationDays) return;
    const start = new Date();
    const arrive = parseISO(deliveryDate);
    const daysToArrive = Math.max(0, Math.floor((arrive - start) / (1000 * 60 * 60 * 24)));
    const totalDays = daysToArrive + parseInt(durationDays, 10);
    const newRows = [];
    for (let i = 0; i <= totalDays; i++) {
      newRows.push({
        dateObj: addDays(start, i),
        sales: '',
        onHandLarge: '',
        onHandSmall: '',
        onOrderLarge: '',
        onOrderSmall: ''
      });
    }
    setRows(newRows);
  }, [deliveryDate, durationDays]);

  const updateCell = (idx, field, val) => {
    const tmp = [...rows];
    tmp[idx][field] = val;
    setRows(tmp);
  };

  // Compute indexes
  const arriveIndex = rows.findIndex(r => format(r.dateObj, 'yyyy-MM-dd') === deliveryDate);

  // Total demand
  const totalSales = rows.reduce((sum, r) => sum + parseFloat(r.sales || 0), 0);
  const requiredLarge = (totalSales / 1000) * usageLarge;
  const requiredSmall = (totalSales / 1000) * usageSmall;

  // Total supply
  const initialLarge = parseFloat(rows[0]?.onHandLarge || 0);
  const initialSmall = parseFloat(rows[0]?.onHandSmall || 0);
  const restockLarge = rows.reduce((sum, r) => sum + parseFloat(r.onOrderLarge || 0), 0);
  const restockSmall = rows.reduce((sum, r) => sum + parseFloat(r.onOrderSmall || 0), 0);
  const availableLarge = initialLarge + restockLarge;
  const availableSmall = initialSmall + restockSmall;

  // Suggested order
  const toOrderLarge = Math.max(requiredLarge - availableLarge, 0).toFixed(2);
  const toOrderSmall = Math.max(requiredSmall - availableSmall, 0).toFixed(2);

  // Waste risk over 4-day life starting delivery
  const salesArray = rows.map(r => parseFloat(r.sales || 0));
  const startIdx = arriveIndex >= 0 ? arriveIndex : 0;
  const endIdx = Math.min(startIdx + 3, rows.length - 1);
  const sales4 = salesArray.slice(startIdx, endIdx + 1).reduce((s, v) => s + v, 0);
  const reqLarge4 = (sales4 / 1000) * usageLarge;
  const reqSmall4 = (sales4 / 1000) * usageSmall;
  const wasteLarge = Math.max(availableLarge - reqLarge4, 0).toFixed(2);
  const wasteSmall = Math.max(availableSmall - reqSmall4, 0).toFixed(2);

  const formattedDelivery = deliveryDate ? format(parseISO(deliveryDate), 'M-d-yyyy') : '';

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Meat Genie</h1>

      <div className="flex items-center mb-4">
        <div className="flex items-center mr-4">
        <div className="w-4 h-4 bg-green-100 border mr-1"></div> Delivery Day
      </div>
        <div className="flex items-center"><div className="w-4 h-4 bg-yellow-100 border mr-1"/> Consumption Days</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label>Delivery Date:</label>
          <input
            type="date"
            min={todayStr}
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            className="p-2 border rounded w-full"
          />
        </div>
        <div>
          <label>Days new order must last:</label>
          <input
            type="number"
            min="1"
            value={durationDays}
            onChange={e => setDurationDays(e.target.value)}
            className="p-2 border rounded w-full"
          />
        </div>
        <div className="p-2 bg-gray-100 rounded">
          <p><strong>Usage Factors (locked):</strong></p>
          <p>Large: {usageLarge} cases/$1k</p>
          <p>Small: {usageSmall} cases/$1k</p>
        </div>
      </div>

      {rows.length > 0 && (
        <table className="w-full table-auto border mb-4">
          <thead>
            <tr>
              <th className="p-2 border">Date (Day)</th>
              <th className="p-2 border">Sales$</th>
              <th className="p-2 border">Usage Lg/day</th>
              <th className="p-2 border">Usage Sm/day</th>
              <th className="p-2 border">On-hand Lg</th>
              <th className="p-2 border">On-hand Sm</th>
              <th className="p-2 border">On-order Lg</th>
              <th className="p-2 border">On-order Sm</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const dayStr = format(r.dateObj, 'EEE');
              const dateStr = format(r.dateObj, 'M-d-yyyy');
              const isDelivery = i === arriveIndex;
              const isConsumption = i > arriveIndex && i <= arriveIndex + parseInt(durationDays, 10);
              const rowClass = isDelivery ? 'bg-green-100' : isConsumption ? 'bg-yellow-100' : 'bg-white';
              const salesVal = parseFloat(r.sales || 0);
              const dailyLg = ((salesVal / 1000) * usageLarge).toFixed(2);
              const dailySm = ((salesVal / 1000) * usageSmall).toFixed(2);
              return (
                <tr key={i} className={rowClass}>
                  <td className="border p-2 font-medium">{`${dateStr} (${dayStr})`}</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={r.sales}
                      onChange={e => updateCell(i, 'sales', e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="border p-2 text-center">{dailyLg}</td>
                  <td className="border p-2 text-center">{dailySm}</td>
                  {['onHandLarge', 'onHandSmall', 'onOrderLarge', 'onOrderSmall'].map((f, j) => (
                    <td key={j} className="border p-2">
                      {!(i >= arriveIndex) ? (
                        <input
                          type="number"
                          value={r[f]}
                          onChange={e => updateCell(i, f, e.target.value)}
                          className="w-full p-1 border rounded"
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows.length > 0 && (
        <>
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h2 className="text-xl mb-2">Suggested Order Qty</h2>
            <p>Large: <strong>{toOrderLarge} cases</strong></p>
            <p>Small: <strong>{toOrderSmall} cases</strong></p>
            <p>Delivery Date: <strong>{formattedDelivery}</strong></p>
          </div>
          {(parseFloat(wasteLarge) > 0 || parseFloat(wasteSmall) > 0) && (
            <div className="text-red-600">
              {parseFloat(wasteLarge) > 0 && <p>Warning: {wasteLarge} cases of large meat may go unused.</p>}
              {parseFloat(wasteSmall) > 0 && <p>Warning: {wasteSmall} cases of small meat may go unused.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
