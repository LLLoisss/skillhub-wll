import { useState } from 'react'
import { Star } from 'lucide-react'

interface SuiteRatingInputProps {
  value: number
  disabled?: boolean
  onChange: (rating: number) => void
}

export function SuiteRatingInput({ value, disabled = false, onChange }: SuiteRatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const displayedRating = hoveredRating ?? value

  return (
    <>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className="p-1 hover:scale-110 transition-transform"
          onMouseEnter={() => setHoveredRating(rating)}
          onMouseLeave={() => setHoveredRating(null)}
          onClick={() => onChange(rating)}
          disabled={disabled}
          aria-label={`${rating} stars`}
          aria-pressed={rating <= value}
        >
          <Star className={`w-5 h-5 ${rating <= displayedRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </>
  )
}
