import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Fade + leve subida ao entrar na viewport — o "bloco vai surgindo" que se
 * repete em várias seções da página. Existe como wrapper genérico pra não
 * reescrever o mesmo initial/whileInView/viewport em cada cartão.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  amount = 0.3,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}
