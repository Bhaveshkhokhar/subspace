import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check 
} from 'lucide-react-native';
import { useTranslation } from '@/hooks/useLanguage';

const { width, height } = Dimensions.get('window');

interface DatePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  initialMonthYear?: Date;
  quickSelectOptions?: Array<{
    label: string;
    days: number;
  }>;
  modalTitle?: string;
}

export default function DatePicker({
  isVisible,
  onClose,
  onDateSelect,
  selectedDate,
  minDate = new Date(),
  maxDate,
  initialMonthYear,
  quickSelectOptions = [
    { label: 'Tomorrow', days: 1 },
    { label: 'Next Week', days: 7 },
    { label: 'Next Month', days: 30 },
    { label: '3 Months', days: 90 },
  ],
  modalTitle = 'Select Date',
}: DatePickerProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    initialMonthYear || selectedDate || new Date()
  );
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(selectedDate || null);

  // Reset the calendar state when modal is opened
  useEffect(() => {
    if (isVisible) {
      setTempSelectedDate(selectedDate || null);
      setCurrentMonth(initialMonthYear || selectedDate || new Date());
    }
  }, [isVisible, selectedDate, initialMonthYear]);

  // Helper function to format date as string
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper to get month name and year
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper to format day names
  const formatDayName = (dayIndex: number): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
  };

  // Navigate to previous/next month
  const navigateMonth = (direction: 'prev' | 'next'): void => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Generate calendar days
  const generateCalendarDays = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    
    // Get first day of the month and how many days in the month
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      days.push(date);
    }
    
    return days;
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (!date) return true;
    
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    const minDateWithoutTime = new Date(minDate);
    minDateWithoutTime.setHours(0, 0, 0, 0);
    
    if (dateWithoutTime < minDateWithoutTime) return true;
    
    if (maxDate) {
      const maxDateWithoutTime = new Date(maxDate);
      maxDateWithoutTime.setHours(0, 0, 0, 0);
      if (dateWithoutTime > maxDateWithoutTime) return true;
    }
    
    return false;
  };

  // Check if date is selected
  const isDateSelected = (date: Date): boolean => {
    if (!tempSelectedDate || !date) return false;
    
    const selectedDate = new Date(tempSelectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return selectedDate.getTime() === compareDate.getTime();
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    return today.getTime() === compareDate.getTime();
  };

  // Handle quick date selection
  const handleQuickDateSelect = (days: number): void => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    
    if (isDateDisabled(date)) return;
    
    setTempSelectedDate(date);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  // Handle date selection
  const handleDateSelect = (date: Date): void => {
    if (!date || isDateDisabled(date)) return;
    
    setTempSelectedDate(date);
  };

  // Handle confirmation
  const handleConfirm = (): void => {
    if (tempSelectedDate) {
      onDateSelect(tempSelectedDate);
    }
    onClose();
  };

  // Handle cancellation
  const handleCancel = (): void => {
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={styles.datePickerContainer}
        >
          {/* Header */}
          <View style={styles.datePickerHeader}>
            <View style={styles.headerContent}>
              <Calendar size={20} color="#6366F1" />
              <Text style={styles.datePickerTitle}>{modalTitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.datePickerClose}
              onPress={handleCancel}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.datePickerContent} showsVerticalScrollIndicator={false}>
            {/* Selected Date Display */}
            {tempSelectedDate && (
              <View style={styles.selectedDateDisplay}>
                <Text style={styles.selectedDateLabel}>
                  {t('common.selected')}:
                </Text>
                <Text style={styles.selectedDateValue}>
                  {formatDateForDisplay(tempSelectedDate)}
                </Text>
              </View>
            )}
            
            {/* Quick Date Options */}
            <View style={styles.quickDateSection}>
              <Text style={styles.quickDateTitle}>Quick Select</Text>
              <View style={styles.quickDateOptions}>
                {quickSelectOptions.map((option, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() + option.days);
                  
                  const isSelected = tempSelectedDate && 
                    tempSelectedDate.toDateString() === date.toDateString();
                  const isDisabled = isDateDisabled(date);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.quickDateButton,
                        isSelected && styles.selectedQuickDateButton,
                        isDisabled && styles.disabledQuickDateButton
                      ]}
                      onPress={() => handleQuickDateSelect(option.days)}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.quickDateButtonText,
                        isSelected && styles.selectedQuickDateButtonText,
                        isDisabled && styles.disabledQuickDateButtonText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Calendar Navigation */}
            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('prev')}
              >
                <ChevronLeft size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <Text style={styles.monthYearText}>
                {formatMonthYear(currentMonth)}
              </Text>
              
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth('next')}
              >
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarContainer}>
              {/* Day Headers */}
              <View style={styles.dayHeaders}>
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
                  <View key={dayIndex} style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>
                      {formatDayName(dayIndex)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Calendar Days */}
              <View style={styles.calendarGrid}>
                {generateCalendarDays(currentMonth).map((date, index) => {
                  if (!date) {
                    return <View key={`empty-${index}`} style={styles.emptyDay} />;
                  }

                  const disabled = isDateDisabled(date);
                  const selected = isDateSelected(date);
                  const today = isToday(date);

                  return (
                    <TouchableOpacity
                      key={`day-${index}`}
                      style={[
                        styles.calendarDay,
                        disabled && styles.disabledDay,
                        selected && styles.selectedDay,
                        today && !selected && !disabled && styles.todayDay
                      ]}
                      onPress={() => handleDateSelect(date)}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        disabled && styles.disabledDayText,
                        selected && styles.selectedDayText,
                        today && !selected && !disabled && styles.todayDayText
                      ]}>
                        {date.getDate()}
                      </Text>
                      {selected && (
                        <View style={styles.selectedDayIndicator}>
                          <Check size={12} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.datePickerCancelText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.datePickerConfirmButton,
                  !tempSelectedDate && styles.disabledDatePickerButton
                ]}
                onPress={handleConfirm}
                disabled={!tempSelectedDate}
              >
                <Text style={styles.datePickerConfirmText}>
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  datePickerContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(55, 65, 81, 0.5)',
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  datePickerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContent: {
    maxHeight: height * 0.6,
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  selectedDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginRight: 8,
  },
  selectedDateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  quickDateSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  quickDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  quickDateOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  selectedQuickDateButton: {
    backgroundColor: '#6366F1',
    borderColor: '#8B5CF6',
  },
  disabledQuickDateButton: {
    opacity: 0.5,
  },
  quickDateButtonText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  selectedQuickDateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledQuickDateButtonText: {
    color: '#6B7280',
  },
  calendarNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 65, 81, 0.5)',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyDay: {
    width: '14.28%',
    height: 44,
    padding: 2,
  },
  calendarDay: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  selectedDay: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  todayDay: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
  },
  disabledDay: {
    opacity: 0.4,
  },
  calendarDayText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  disabledDayText: {
    color: '#6B7280',
  },
  selectedDayIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 65, 81, 0.5)', 
  },
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  datePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledDatePickerButton: {
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    opacity: 0.7,
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});