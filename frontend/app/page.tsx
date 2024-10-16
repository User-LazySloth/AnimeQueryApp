'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import axios from 'axios'

interface Match {
  id: string
  score: number
  metadata: {
    name: string
    [key: string]: any
  }
  synopsis: string
}

interface QueryResponse {
  matches: Match[]
  namespace: string
}

export default function AnimeQueryApp() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QueryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post('https://animequeryapp.onrender.com/query', { text: query })
      setResults(response.data)
    } catch (err) {
      setError('An error occurred while fetching results')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Anime Query App</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query"
            className="flex-grow"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </form>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {results && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          {results.matches.map((match) => (
            <Card key={match.id} className="mb-4">
              <CardHeader>
                <CardTitle>{match.metadata.name}</CardTitle>
                <CardDescription>Score: {match.score.toFixed(4)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2"><strong>Synopsis:</strong> {match.synopsis}</p>
                <p><strong>Metadata:</strong></p>
                <ul className="list-disc pl-5">
                  {Object.entries(match.metadata).map(([key, value]) => (
                    <li key={key}>{key}: {value}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
