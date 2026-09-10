import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeSlot {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AvailabilityScheduleProps {
  schedule?: TimeSlot[];
  onSave: (schedule: TimeSlot[]) => void;
  isLoading?: boolean;
}

export function AvailabilitySchedule({ schedule, onSave, isLoading = false }: AvailabilityScheduleProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    schedule || DAYS.map(day => ({ day, enabled: false, startTime: '09:00', endTime: '17:00' }))
  );

  const handleToggleDay = (day: string) => {
    setTimeSlots(prev =>
      prev.map(slot =>
        slot.day === day ? { ...slot, enabled: !slot.enabled } : slot
      )
    );
  };

  const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeSlots(prev =>
      prev.map(slot =>
        slot.day === day ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleSave = () => {
    onSave(timeSlots);
  };

  const enabledDays = timeSlots.filter(slot => slot.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Availability Schedule
        </CardTitle>
        <CardDescription>
          Set your preferred working hours. You'll automatically go online/offline based on your schedule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Schedule Status</p>
            <p className="text-sm text-muted-foreground">
              {enabledDays > 0 
                ? `${enabledDays} day${enabledDays !== 1 ? 's' : ''} enabled`
                : 'No schedule set - manual control only'}
            </p>
          </div>
          <Badge variant={enabledDays > 0 ? "default" : "secondary"}>
            {enabledDays > 0 ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => {
            const slot = timeSlots.find(s => s.day === day)!;
            return (
              <div
                key={day}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Switch
                    checked={slot.enabled}
                    onCheckedChange={() => handleToggleDay(day)}
                  />
                  <Label className="font-medium w-24">{day}</Label>
                </div>
                {slot.enabled && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={slot.startTime}
                      onValueChange={(value) => handleTimeChange(day, 'startTime', value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return [`${hour}:00`, `${hour}:30`];
                        }).flat().map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">to</span>
                    <Select
                      value={slot.endTime}
                      onValueChange={(value) => handleTimeChange(day, 'endTime', value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = i.toString().padStart(2, '0');
                          return [`${hour}:00`, `${hour}:30`];
                        }).flat().map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Save Schedule"}
        </Button>

        <p className="text-xs text-muted-foreground">
          When enabled, you'll automatically go online at the start time and offline at the end time for each day.
        </p>
      </CardContent>
    </Card>
  );
}

