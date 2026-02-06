import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import fr from 'date-fns/locale/fr';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { useNavigate } from 'react-router-dom';
import type { Event } from '../types';

const locales = { 'fr': fr };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Event;
}

interface EventCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const navigate = useNavigate();

  const calendarEvents: CalendarEvent[] = events.map(event => ({
    id: event.id,
    title: event.name,
    start: new Date(event.startDate),
    end: new Date(event.endDate),
    resource: event,
  }));

  const handleSelectEvent = (calEvent: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(calEvent.resource);
    } else {
      navigate(`/events/${calEvent.id}`);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const eventType = event.resource.type;
    let backgroundColor = '#3b82f6'; // default blue

    switch (eventType) {
      case 'CB':
        backgroundColor = '#8b5cf6'; // purple
        break;
      case 'Mini CB':
        backgroundColor = '#ec4899'; // pink
        break;
      case 'Afterwork':
        backgroundColor = '#f59e0b'; // amber
        break;
      default:
        backgroundColor = '#10b981'; // emerald for "Autre"
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '12px',
        padding: '2px 4px',
      }
    };
  };

  return (
    <div className="h-[600px] bg-card rounded-lg p-4 border border-border">
      <Calendar
        localizer={localizer}
        events={calendarEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
        defaultView={Views.MONTH}
        messages={{
          today: "Aujourd'hui",
          previous: 'Précédent',
          next: 'Suivant',
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Heure',
          event: 'Événement',
          noEventsInRange: 'Aucun événement dans cette période',
          showMore: (total: number) => `+ ${total} de plus`,
        }}
        popup
        selectable={false}
        culture="fr"
      />
    </div>
  );
}
