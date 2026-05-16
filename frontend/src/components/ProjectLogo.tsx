import logoFull from '../assets/reysoft-asistencia-logo.svg';
import logoMark from '../assets/reysoft-asistencia-mark.svg';

interface ProjectLogoProps {
  className?: string;
  variant?: 'full' | 'mark';
}

export function ProjectLogo({ className = '', variant = 'full' }: ProjectLogoProps) {
  return <img src={variant === 'mark' ? logoMark : logoFull} alt="ReySoft-Asistencia" className={className} />;
}
