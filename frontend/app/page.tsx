'use client'

import { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AnimeMatch = [string, [string, number, string]]
type QueryResponse = AnimeMatch[]

const ITEMS_PER_PAGE = 1

export default function AnimeQueryApp() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QueryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const sortedResults = useMemo(() => {
    if (!results) return null
    return [...results].sort((a, b) => b[1][1] - a[1][1])
  }, [results])

  const paginatedResults = useMemo(() => {
    if (!sortedResults) return null
    return sortedResults.slice(1) // Exclude the best match
      .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
  }, [sortedResults, currentPage])

  const pageCount = useMemo(() => {
    if (!sortedResults) return 0
    return Math.ceil((sortedResults.length - 1) / ITEMS_PER_PAGE)
  }, [sortedResults])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setCurrentPage(0)
    try {
      const response = await fetch('https://animequeryapp.onrender.com/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      })
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }
      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError('An error occurred while fetching results')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
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
      {sortedResults && sortedResults.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Best Match:</h2>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{sortedResults[0][0]}</CardTitle>
              <CardDescription>Score: {sortedResults[0][1][1].toFixed(4)}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-2"><strong>Synopsis:</strong> {sortedResults[0][1][0]}</p>
              <p><strong>Genres:</strong> {sortedResults[0][1][2]}</p>
            </CardContent>
          </Card>
          {sortedResults.length > 1 && (
            <>
              <h2 className="text-xl font-semibold mb-2">Other Matches:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {paginatedResults?.map(([name, [synopsis, score, genres]], index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>{name}</CardTitle>
                      <CardDescription>Score: {score.toFixed(4)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2"><strong>Synopsis:</strong> {synopsis}</p>
                      <p><strong>Genres:</strong> {genres}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-center gap-2">
                <Button 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="self-center">
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === pageCount - 1}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        results === null ? null : <p>No results found.</p>
      )}
    </div>
  )
}