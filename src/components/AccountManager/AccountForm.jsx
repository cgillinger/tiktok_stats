import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, Check } from 'lucide-react';

/**
 * Formulär för att skapa eller redigera ett TikTok-konto
 * @param {Object} props - Komponentens properties
 * @param {Object} [props.account] - Befintligt konto att redigera (null för nytt konto)
 * @param {Function} props.onSubmit - Callback som anropas vid formulärinskickning
 * @param {Function} props.onCancel - Callback som anropas vid avbrytande
 */
export function AccountForm({ account, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    description: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const isEditing = Boolean(account?.id);
  
  // Fyll i formulärdata om ett konto redigeras
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        username: account.username || '',
        description: account.description || ''
      });
    }
  }, [account]);
  
  // Hantera ändringar i formulärfält
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Hantera formulärinskickning
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validera formulärdata
      if (!formData.name || formData.name.trim() === '') {
        throw new Error('Kontonamn måste anges');
      }
      
      // Anropa förälderns onSubmit-callback
      await onSubmit({
        ...formData,
        id: account?.id
      });
      
      // Visa framgångsmeddelande
      setSuccess(true);
      
      // Stäng formuläret efter 1 sekund vid framgång
      setTimeout(() => {
        setSuccess(false);
        onCancel();
      }, 1000);
    } catch (err) {
      console.error('Fel vid formulärinskickning:', err);
      setError(err.message || 'Något gick fel');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Redigera konto' : 'Lägg till nytt konto'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {isEditing ? 'Kontot har uppdaterats' : 'Kontot har skapats'}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Kontonamn *</Label>
            <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="T.ex. Företagskonto, Kampanjkonto"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">TikTok-användarnamn</Label>
            <Input 
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="T.ex. @foretaget"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Ange användarnamnet utan @-symbol
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Input 
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Valfri beskrivning"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? 'Uppdaterar...' : 'Skapar...'}
              </>
            ) : (
              isEditing ? 'Uppdatera konto' : 'Skapa konto'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}