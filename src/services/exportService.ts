import jsPDF from 'jspdf';
import type { Trip } from '../types/trip';
import { getAirlineByIata } from '../data/airlines';

const COLORS = {
  primary: [233, 69, 96] as [number, number, number],
  dark: [26, 26, 46] as [number, number, number],
  text: [51, 51, 51] as [number, number, number],
  lightText: [136, 136, 136] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (time: string) => {
  if (!time) return '';
  if (time.includes(':')) return time;
  if (time.length === 4) return `${time.slice(0, 2)}:${time.slice(2)}`;
  return time;
};

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getTripDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const getDayDate = (startDate: string, dayNumber: number) => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const exportTripToPdf = (trip: Trip): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  const checkNewPage = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(trip.name, margin, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`, margin, 36);
  
  const totalDays = getTripDays(trip.startDate, trip.endDate);
  doc.text(`${totalDays} days`, pageWidth - margin - 30, 36);
  
  yPos = 60;

  // Trip Summary
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Trip Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.lightText);
  doc.text(`Destinations: ${trip.destinations.length}`, margin, yPos);
  doc.text(`Flights: ${trip.flights?.length || 0}`, margin + 50, yPos);
  doc.text(`Expenses: ${trip.expenses?.length || 0}`, margin + 100, yPos);
  yPos += 15;

  // Flights Section
  if (trip.flights && trip.flights.length > 0) {
    checkNewPage(40);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 12, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('✈️ Flights', margin + 2, yPos + 4);
    yPos += 15;

    trip.flights.forEach((flight) => {
      checkNewPage(25);
      
      const airline = getAirlineByIata(flight.airlineCode);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(`${flight.flightNumber}`, margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(`${airline?.name || flight.airlineName}`, margin + 25, yPos);
      
      doc.setTextColor(...COLORS.lightText);
      doc.setFontSize(10);
      const flightInfo = `${formatDate(flight.date)} at ${formatTime(flight.time)}`;
      doc.text(flightInfo, margin, yPos + 5);
      
      if (flight.origin || flight.destination) {
        const route = flight.type === 'arrival' 
          ? `From: ${flight.origin}` 
          : `To: ${flight.destination}`;
        doc.text(route, margin + 80, yPos + 5);
      }
      
      yPos += 15;
    });
    yPos += 5;
  }

  // Destinations by Day
  checkNewPage(30);
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 12, 'F');
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('📍 Itinerary', margin + 2, yPos + 4);
  yPos += 15;

  for (let day = 1; day <= totalDays; day++) {
    const dayDestinations = trip.destinations.filter(d => d.day === day);
    
    checkNewPage(20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Day ${day} - ${getDayDate(trip.startDate, day)}`, margin, yPos);
    yPos += 7;

    if (dayDestinations.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.lightText);
      doc.text('No destinations planned', margin + 5, yPos);
      yPos += 10;
    } else {
      dayDestinations.sort((a, b) => a.order - b.order).forEach((dest, idx) => {
        checkNewPage(20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text(`${idx + 1}. ${dest.name}`, margin + 5, yPos);
        
        if (dest.arrivalTime) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.lightText);
          doc.text(`@ ${dest.arrivalTime}`, margin + 120, yPos);
        }
        yPos += 5;
        
        if (dest.address) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...COLORS.lightText);
          doc.text(dest.address.substring(0, 60), margin + 10, yPos);
          yPos += 5;
        }
        
        if (dest.notes) {
          doc.setFont('helvetica', 'italic');
          doc.text(`Note: ${dest.notes.substring(0, 50)}...`, margin + 10, yPos);
          yPos += 5;
        }
        
        yPos += 3;
      });
    }
    yPos += 5;
  }

  // Budget Summary
  if (trip.expenses && trip.expenses.length > 0) {
    checkNewPage(60);
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 12, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 Budget Summary', margin + 2, yPos + 4);
    yPos += 18;

    const totalSpent = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(`Total Spent: ${formatAmount(totalSpent, trip.currency)}`, margin, yPos);
    
    if (trip.totalBudget) {
      const remaining = trip.totalBudget - totalSpent;
      doc.setFontSize(10);
      if (remaining >= 0) {
        doc.setTextColor(76, 175, 80);
      } else {
        doc.setTextColor(244, 67, 54);
      }
      doc.text(
        `${remaining >= 0 ? 'Remaining' : 'Over'}: ${formatAmount(Math.abs(remaining), trip.currency)}`,
        margin + 90,
        yPos
      );
    }
    yPos += 10;

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    trip.expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      checkNewPage(8);
      doc.text(`• ${cat}: ${formatAmount(amount, trip.currency)}`, margin + 5, yPos);
      yPos += 6;
    });
  }

  // Notes
  if (trip.description) {
    checkNewPage(40);
    yPos += 10;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 12, 'F');
    
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📝 Notes', margin + 2, yPos + 4);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const lines = doc.splitTextToSize(trip.description, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      checkNewPage(6);
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  }

  // Footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.lightText);
    doc.text(
      `Generated by My Trip Handler • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const filename = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_itinerary.pdf`;
  doc.save(filename);
};
