import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { AlertTriangle, X, Bell } from 'lucide-react';

interface AlertBannerProps {
    alerts: Array<{
        id: string;
        type: string;
        message: string;
        severity: 'warning' | 'critical';
    }>;
    onDismiss: (alertId: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
    const { theme } = useTheme();

    if (alerts.length === 0) return null;

    // Show only critical alerts in the banner
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    
    if (criticalAlerts.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 rounded-lg p-3 ${
                    theme === 'light'
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-red-900/30 border border-red-500/50'
                }`}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <Bell className={`w-5 h-5 ${
                            theme === 'light' ? 'text-red-600' : 'text-red-400'
                        }`} />
                    </div>
                    
                    <div className="flex-1">
                        <p className={`text-sm font-medium ${
                            theme === 'light' ? 'text-red-800' : 'text-red-200'
                        }`}>
                            {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
                        </p>
                        
                        <div className="mt-2 space-y-2">
                            {criticalAlerts.map(alert => (
                                <div 
                                    key={alert.id}
                                    className={`flex items-center justify-between text-sm ${
                                        theme === 'light' ? 'text-red-700' : 'text-red-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{alert.message}</span>
                                    </div>
                                    <button aria-label="Close"
                                        onClick={() => onDismiss(alert.id)}
                                        className={`p-1 rounded hover:bg-red-200/50 ${
                                            theme === 'light' ? 'text-red-500' : 'text-red-400'
                                        }`}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
