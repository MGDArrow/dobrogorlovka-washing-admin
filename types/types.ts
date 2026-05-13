export type TStatus =
  | 'Активный'
  | 'Завершённый'
  | 'Завершена'
  | 'Постоянный'
  | 'Предподготовка';

export type TIcons =
  | ''
  | 'angle-left'
  | 'angle-right'
  | 'close-cross'
  | 'close-cross-circle'
  | 'minus'
  | 'plus'
  | 'zero'
  | 'mail'
  | 'eye'
  | 'eye-slash'
  | 'lock'
  | 'search'
  | 'viber'
  | 'whatsapp'
  | 'telegram'
  | 'phone'
  | 'smartphone'
  | 'location-cross'
  | 'clock'
  | 'calendar'
  | 'moon'
  | 'sun'
  | 'gear'
  | 'shuffle'
  | 'list'
  | 'chart-pie'
  | 'services'
  | 'profile'
  | 'cemetery'
  | 'church'
  | 'info'
  | 'contacts'
  | 'colors'
  | 'heart'
  | 'heart-pulse'
  | 'blood'
  | 'plasma'
  | 'equals'
  | 'first'
  | 'person';

export interface ReportData {
  title: string;
  tableHeader: string[];
  tableBody: (string | number)[][];
  detailsHeader: string[];
  detailsBody: (string | number)[][];
}
