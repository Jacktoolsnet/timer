% PaulLiu
% 
\version "2.24.0"
\header {
 title = "Kinderscenen"
 subtitle = "Von fremden Ländern und Menschen"
 composer = "Robert Alexander Schumann"
 mutopiatitle = "Kinderscenen - Von fremden Ländern und Menschen"
 mutopiacomposer = "SchumannR"
 mutopiaopus = "O 15 N 1"
 mutopiainstrument = "Piano"
 date = "18th C."
 source = "Leichte Stucke, 1900"
 style = "Romantic"
 copyright = "Public Domain"
 maintainer = "Ying-Chun Liu"
 maintainerEmail = "grandpaul@gmail.com"
 maintainerWeb = "http://www.cis.nctu.edu.tw/~is86007/"
 lastupdated = "2006/Jan/01"

 footer = "Mutopia-2006/01/01-354"
 tagline = \markup { \override #'(box-padding . 1.0) \override #'(baseline-skip . 2.7) \box \center-column { \small \line { Sheet music from \with-url "http://www.MutopiaProject.org" \line { \teeny www. \hspace #-1.0 MutopiaProject \hspace #-1.0 \teeny .org \hspace #0.5 } • \hspace #0.5 \italic Free to download, with the \italic freedom to distribute, modify and perform. } \line { \small \line { Typeset using \with-url "http://www.LilyPond.org" \line { \teeny www. \hspace #-1.0 LilyPond \hspace #-1.0 \teeny .org } by \maintainer \hspace #-1.0 . \hspace #0.5 Reference: \footer } } \line { \teeny \line { This sheet music has been placed in the public domain by the typesetter, for details see: \hspace #-0.5 \with-url "http://creativecommons.org/licenses/publicdomain" http://creativecommons.org/licenses/publicdomain } } } }
}

fingerDU = \set fingeringOrientations = #'(down up)
fingerD = \set fingeringOrientations = #'(down)
fingerUL = \set fingeringOrientations = #'(up left)
fingerUR = \set fingeringOrientations = #'(up right)
fingerU = \set fingeringOrientations = #'(up)
fingerL = \set fingeringOrientations = #'(left)
fingerLRUD = \set fingeringOrientations = #'(left right up down)


repeattr = {
	\relative c {
		\context Voice = "repeattr" {
			\stemDown
			\repeat volta 1
			{ s2 s2 s2 s2 s2 s2 s2 s2 }
			\repeat volta 1 
			{ s2 s2 s2 s2 s2 s2
			  s2 s2 s2 s2 s2 s2 s2
			  s2
			}
			\bar "|."
		}
	}
}

pedaltr =  {
s2 s2 s2 s2 s2 s2 s2 s4\sustainOn s8 s16 s16\sustainOff
s2 s2 s2 s2 s2 s4 s8\sustainOn s16 s16\sustainOff
s2 s2 s2 s2 s2 s2 s2
s4\sustainOn s8 s16 s16\sustainOff
}

dynamictr = {
			s4\p s4  s2 s2 s2 s2 s2 s4 s4\> s4 s8 s8\!
			s4\p s4 s2 s2 s2 s4 s8 s8\< s4 s8 s16 s16\!
			s4\p s4 s2 s2 s2 s2 s4  s4\>  s2
			s4 s4\!
}


viola = {
	\relative c'' { 
		\context Voice = "viola" {
			\stemUp
			\phrasingSlurUp
			\fingerU
			b4-2 \( g'-5 
			fis8.^\markup { \fontsize #-3 \number "4-5" } e16-4 d4-3\) 
			b-2\( g' 
			fis8.^\markup { \fontsize #-3 \number "4-5" } e16-4 d4-3\)
			b-2\( g' 
			e8.^\markup { \fontsize #-3 \number "4-5" } d16-4 c4-3 
			a4-2 d-5 b2-4\)
%
			<g-2 b-4>4\( <a c> 
			<fis-2 a-4> <g b>\)
			<e-2 g-4>\( <e a> 
			<dis-3 fis-4> <d-2 g-5>\)
			e-2^"ritard."\( fis g8. a16  b8.^\fermata 
			c16 d4^"a tempo"\)\( g fis8.^\markup { \fontsize #-3 \number "4-5" } e16 d4\)
			b-2\( g' fis8.^\markup { \fontsize #-3 \number "4-5" } e16-4 d4-3\)
			b-2\( g' e8.^\markup { \fontsize #-3 \number "4-5" } d16-4 c4-3 a-2 d-5 b2-4\)
		}
	}
}

oboes = {
	\relative c'' { 
		\context Voice = "oboe" {
			\stemNeutral
			\fingerU
			
			\tuplet 3/2 {<b,-2>8 ( d 
			  g ) }

			 
			\tuplet 3/2 {<bes,-2>8 ( e 
			  g ) }

	\override TupletBracket.number-visibility % number-visibility is deprecated. Tune the TupletNumber instead
 = ##f
			
			\tuplet 3/2 {a,8 d 
			  fis }
			
			
			\tuplet 3/2 {c8 d 
			 a' }
			
			
			\tuplet 3/2 {b,8 d 
			 g }

			
			\tuplet 3/2 {bes,8 e 
			 g }
 
			
			\tuplet 3/2 {a,8 d 
			 fis }

			
			\tuplet 3/2 {c8 d 
			 a' }

			
			\tuplet 3/2 {b,8 d 
			 g }

			
			\tuplet 3/2 {g,8 d' 
			 g }

			
			\tuplet 3/2 {g,8 e' 
			 g }

			
			\tuplet 3/2 {g,8 c 
			 g' }

			
			\tuplet 3/2 {<g,-2>8 c 
			 g' }

			
			\tuplet 3/2 {fis,8 c' 
			\fingerL
			 <fis-2> }

			\fingerU
			
			\tuplet 3/2 {<d,-2>8 b' 
			\fingerL
			 <g'-1> }

			\fingerU
			
			\tuplet 3/2 {<g,-3>8 b 
			 g' }
%
			
			\tuplet 3/2 {e,8 b' 
			 e }
			
			
			\tuplet 3/2 {a,,8 a' 
			 e' }

			
			\tuplet 3/2 {d,8 a' 
			 d }

			
			\tuplet 3/2 {b,8 g' 
			 d' }

			
			\tuplet 3/2 {c,8 g' 
			 c }

			
			\tuplet 3/2 {fis,,8 fis' 
			 c' }

			
			\tuplet 3/2 {b,8 fis' 
			 b }

			
			\tuplet 3/2 {g,8 g' 
			 b }

			
			\tuplet 3/2 {c,8 g' 
			 c }

			
			\tuplet 3/2 {<d,-4>8 a' 
			 d }

			
			\tuplet 3/2 {<b,-2>8 g' 
			 d' }

			
			\tuplet 3/2 {g,,8 a' 
			 d }

			
			\tuplet 3/2 {<b-2>8 d 
			 g }

			
			\tuplet 3/2 {bes,8 e 
			 g }

			
			\tuplet 3/2 {a,8 d 
			 fis }

			
			\tuplet 3/2 {c8 d 
			 a' }

			
			\tuplet 3/2 {<b,-2>8 d 
			 g }

			
			\tuplet 3/2 {bes,8 e 
			 g }

			
			\tuplet 3/2 {a,8 d 
			 fis }

			
			\tuplet 3/2 {c8 d 
			 a' }

			
			\tuplet 3/2 {b,8 d 
			 g }

			
			\tuplet 3/2 {g,8 d' 
			 g }

			
			\tuplet 3/2 {g,8 e' 
			 g }

			
			\tuplet 3/2 {g,8 c 
			 g' }

			
			\tuplet 3/2 {<g,-2>8 c 
			 g' }

			
			\tuplet 3/2 {fis,8 c' 
			\fingerL
			 <fis-2> }
			\fingerU

			
			\tuplet 3/2 {<d,-2>8 b' 
			\fingerL
			 <g'-1> }
			\fingerU

%			
%			\tuplet 3/2 { b,8 b8 
%			 g' }
			s4

		}
	}
}

bassvoices =  {
	\relative c' {
		\context Voice = "bassvoice" {
			\stemDown
			\fingerD
			<g-3>8 r8 <cis,-5> r d r <fis-4> r <g-3> r cis, r d r <fis-4> r 
			<g-3> r b,  r  c r <e-4> r <d-5> r d r g, r g' r
%
			\phrasingSlurDown
			<e-2>4 \( a, <d-3>8. <c-4>16  <b-5>4 \)
			<c-2> \( fis, <b-3>8. <a-4>16 <g-5>4 \)
			<c-3>4 \( <c-5>4 <b-3>8. <a-4>16 <g-5>4 \)
			<g'-3>8 r8 cis, r d r  <fis-4> r <g-3> r cis, r d r <fis-4> r 
			<g-3> r b,8  r8 c8  r8 e8-4 r8 d8-5 r8 d8 r8 
			<g, d'>2
		}
	}
}

bassvoicestwo =  {
	\relative c' {
		\context Voice = "bassvoicetwo" {
			\stemDown
			\slurDown
			s2 s2 s2 s2 s4 g4~ g4 s4 
			s2 s2
%
			s2 s2 s2 s2 s2
			d2 s2 s2 s2 s2 s4 g4~ g4 s4 s2
	\override TupletBracket.number-visibility % number-visibility is deprecated. Tune the TupletNumber instead
 = ##f
	\override TupletBracket.bracket-visibility = ##f
			
			\tuplet 3/2 {s8 b4~ }

			
			\tuplet 3/2 { b8 b8 
			 g'8 }
			
		}
	}
}




% Project performance wrapper: keep the helper's four note voices separate.
% Staff changes only alter engraving; removing them does not change pitches.
\score {
 <<
  \new Staff = "melody" { \key g \major \time 2/4 \viola }
  \new Staff = "arpeggio" { \key g \major \time 2/4 \oboes }
  \new Staff = "bass" { \key g \major \time 2/4 \bassvoices }
  \new Staff = "counter" { \key g \major \time 2/4 \bassvoicestwo }
 >>
 \midi { \tempo 4=72 }
}
