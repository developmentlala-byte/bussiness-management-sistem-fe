import React from "react";
import {
  // Spa & Relaksasi
  FlowerLotus,
  Flower,
  YinYang,
  Bathtub,
  Drop,
  //   Drops,
  Wind,
  Fire,

  // Salon & Rambut / Makeup
  Scissors,
  PaintBrush,
  Palette,

  // Perawatan Wajah & Estetika
  Eye,
  Smiley,
  MagicWand,
  Syringe,
  Bandaids,

  // Pijat & Perawatan Tubuh
  Hand,
  HandPalm,
  HandHeart,
  Barbell,

  // Natural & Organik
  Plant,
  Leaf,

  // Estetika Premium & General Beauty
  Sparkle,
  //   Sparkles,
  Crown,
  Diamond,
  Heart,
  Star,
  Sun,
  Moon,

  // Fallback
  Question,
} from "@phosphor-icons/react";

interface DynamicIconProps {
  name?: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  className,
}) => {
  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    // Spa & Relaksasi
    "ph-flower-lotus": FlowerLotus,
    "ph-flower": Flower,
    "ph-yin-yang": YinYang,
    "ph-bathtub": Bathtub,
    "ph-drop": Drop,
    // "ph-drops": Drops,
    "ph-wind": Wind,
    "ph-fire": Fire,

    // Salon & Rambut
    "ph-scissors": Scissors,
    "ph-paint-brush": PaintBrush,
    "ph-palette": Palette,

    // Perawatan Wajah & Estetika
    "ph-eye": Eye,
    "ph-smiley": Smiley,
    "ph-magic-wand": MagicWand,
    "ph-syringe": Syringe,
    "ph-bandaids": Bandaids,

    // Pijat & Perawatan Tubuh
    "ph-hand": Hand,
    "ph-hand-palm": HandPalm,
    "ph-hand-heart": HandHeart,
    "ph-barbell": Barbell,

    // Natural & Organik
    "ph-plant": Plant,
    "ph-leaf": Leaf,

    // Estetika Premium & General Beauty
    "ph-sparkle": Sparkle,
    // "ph-sparkles": Sparkles,
    "ph-crown": Crown,
    "ph-diamond": Diamond,
    "ph-heart": Heart,
    "ph-star": Star,
    "ph-sun": Sun,
    "ph-moon": Moon,
  };

  if (!name || !iconMap[name]) {
    return <Question className={className} />;
  }

  const SelectedIcon = iconMap[name];
  return <SelectedIcon className={className} />;
};
