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
          className="p-0.5 transition-transform hover:scale-110"
          onMouseEnter={() => setHoveredRating(rating)}
          onMouseLeave={() => setHoveredRating(null)}
          onClick={() => onChange(rating)}
          disabled={disabled}
          aria-label={`${rating} stars`}
          aria-pressed={rating <= value}
        >
          <Star className={`h-5 w-5 ${rating <= displayedRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </>
  )
}
